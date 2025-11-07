

const chalk = require('chalk');
const fs = require('fs');
const csv = require('csv-parser');
//const db = require('../../models/index'); // Make sure this path is correct for your project
const db = require('../../models'); 

function normalizePriceValues(raw) {
  if (!raw) return [];
  const s = String(raw).trim();

  // Clean lists like "0,500" or "1000,5000"
  if (/^\d+(,\d+)+$/.test(s)) {
    return s.split(',').map(v => v.trim()).filter(Boolean);
  }

  // "10,005,000" -> ["1000","5000"]
  if (/^\d{2},\d{3},\d{3}$/.test(s)) {
    const digits = s.replace(/,/g, ''); // "10005000"
    return [digits.slice(0, 4), digits.slice(4)];
  }

  // "1,000,500" -> ["1000","500"]
  if (/^\d{1},\d{3},\d{3}$/.test(s)) {
    const digits = s.replace(/,/g, ''); // "1000500"
    return [digits.slice(0, digits.length - 3), digits.slice(-3)];
  }

  // Normal thousands formatting "1,000" or "25,000.50"
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    return [s.replace(/,/g, '')];
  }

  // Fallback: split by comma/space and clean
  return s
    .split(/[,|\s]+/)
    .map(v => v.trim().replace(/[^\d.]/g, ''))
    .filter(Boolean);
}

/**
 * Import the new "pivot-style" product filters CSV:
 * Columns: product_id, product_code, (filter_field_id_X, <Field Name>), ...
 * The value column may contain comma-separated values.
 */
const processProductFiltersCsvFile = (csvFilePath) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Fetch all filter fields with their allowed values before processing
      const filterFields = await db.FilterField.findAll({
        attributes: ['id', 'field_name', 'allowed_values', 'field_type'],
        raw: true
      });
      
      // Build a map of filter_field_id -> { field_name, allowed_values_set }
      const filterFieldMap = new Map();
      for (const field of filterFields) {
        const allowedValuesArray = field.allowed_values 
          ? field.allowed_values.split(',').map(v => v.trim().toLowerCase())
          : [];
        filterFieldMap.set(field.id, {
          field_name: field.field_name,
          allowed_values_set: new Set(allowedValuesArray),
          field_type: field.field_type
        });
      }

      const pending = [];
      const successRows = [];
      const errorRows = [];
      const validationErrors = []; // Track validation errors separately

      // We need the ordered headers to pair each ID column with its value column.
      let headerOrder = [];
      // Map of idColumn -> valueColumn (computed once from headers)
      const idToValueCol = []; // array of { idCol, valueCol, idNumber }

      // Track which (product_id, filter_field_id) we've already deleted for
      const seenPairs = new Set();

      const stream = fs.createReadStream(csvFilePath)
      .pipe(csv({
        mapHeaders: ({ header, index }) => header, // keep original headers as-is
      }))
        .on('headers', (headers) => {
          headerOrder = headers;

          // Build pairs: for each "filter_field_id_<id>", pair it with the next column
          for (let i = 0; i < headers.length; i++) {
            const h = headers[i];
            const m = /^filter_field_id_(\d+)$/.exec(h);
            if (m) {
              const idNumber = parseInt(m[1], 10);
              const valueCol = headers[i + 1]; // the field-name column right after the id column
              if (!valueCol) {
                console.warn(chalk.yellow(`No value column after ${h}; skipping this field id.`));
                continue;
              }
              idToValueCol.push({ idCol: h, valueCol, idNumber });
            }
          }

          if (idToValueCol.length === 0) {
            console.error(chalk.red('No filter_field_id_* columns detected. Is this the new pivot CSV?'));
          } else {
            console.log(chalk.blue(`Detected ${idToValueCol.length} filter fields from header.`));
          }
        })
      .on('data', (row) => {
        try {
          // Get all keys and find the one that contains 'product_id' (handles BOM and hidden characters)
          const keys = Object.keys(row);
          const productIdKey = keys.find(k => k.includes('product_id') || k.trim() === 'product_id');
          
          // Try to get the value
          let productIdRaw = productIdKey ? row[productIdKey] : (row.product || row[' product_id']);
          
          // If we found something, convert to string and trim
          if (productIdRaw !== undefined && productIdRaw !== null && productIdRaw !== '') {
            productIdRaw = String(productIdRaw).trim();
          }
          
          // Parse to integer
          const product_id = parseInt(productIdRaw, 10);
          
          // Check if we got a valid number
          if (!productIdRaw || isNaN(product_id) || product_id <= 0) {
            errorRows.push({ row, reason: 'Missing or invalid product_id', availableKeys: keys });
            console.error(chalk.red(`Missing product_id in row: ${JSON.stringify(row)}`));
            console.error(chalk.yellow(`Available column headers: ${keys.join(', ')}`));
            console.error(chalk.yellow(`productIdKey found: "${productIdKey}"`));
            console.error(chalk.yellow(`productIdRaw value: "${productIdRaw}", parsed: ${product_id}`));
            return;
          }

          // For each (id column, value column) pair
          for (const { idCol, valueCol, idNumber } of idToValueCol) {
            const filter_field_id = parseInt(row[idCol], 10);
            // If the id cell is empty or not a number, skip this column pair
            if (!filter_field_id || Number.isNaN(filter_field_id)) continue;

            const rawValueCell = row[valueCol] ?? '';
            const rawValue = String(rawValueCell).trim();

            // Build pair key and clear existing values once per product+field
            const pairKey = `${product_id}::${filter_field_id}`;
            if (!seenPairs.has(pairKey)) {
              seenPairs.add(pairKey);
              pending.push(
                db.sequelize.query(
                  `DELETE FROM product_filters
                   WHERE product_id = :product_id
                     AND filter_field_id = :filter_field_id`,
                  {
                    replacements: { product_id, filter_field_id },
                    type: db.sequelize.QueryTypes.DELETE,
                  }
                ).catch(err => {
                  errorRows.push({ row, reason: `Failed to clear old values: ${err.message}` });
                  console.error(chalk.red(`Failed to clear old values for product ${product_id}, field ${filter_field_id}: ${err.message}`));
                })
              );
            }

            // If no value provided, nothing to insert (empty cell)
            if (!rawValue) continue;

            // Split or normalize values
            let values = [];
            if (filter_field_id === 1) {
              // Product Price special logic
              values = normalizePriceValues(rawValue);
            } else {
              values = rawValue.split(',').map(v => v.trim()).filter(Boolean);
            }

            // Validate values against filter_fields allowed_values
            const fieldInfo = filterFieldMap.get(filter_field_id);
            if (!fieldInfo) {
              const errorMsg = `Filter field ID ${filter_field_id} does not exist in filter_fields table.`;
              validationErrors.push({
                product_id,
                filter_field_id,
                field_name: valueCol,
                error: errorMsg
              });
              errorRows.push({ row, reason: errorMsg });
              console.error(chalk.red(errorMsg));
              continue; // Skip this filter field
            }

            // Check each value against allowed_values
            for (const val of values) {
              // Skip validation for Price field (field_type might be 'range' or similar)
              // or if allowed_values is empty (no restrictions)
              if (fieldInfo.allowed_values_set.size > 0 && filter_field_id !== 1) {
                const normalizedVal = val.toLowerCase();
                if (!fieldInfo.allowed_values_set.has(normalizedVal)) {
                  const errorMsg = `Value "${val}" not found in filter_fields allowed_values for field "${fieldInfo.field_name}" (ID: ${filter_field_id}). Please add it to filter_fields first, then try again.`;
                  validationErrors.push({
                    product_id,
                    filter_field_id,
                    field_name: fieldInfo.field_name,
                    invalid_value: val,
                    allowed_values: Array.from(fieldInfo.allowed_values_set),
                    error: errorMsg
                  });
                  errorRows.push({ row, filter_value: val, reason: errorMsg });
                  console.error(chalk.red(errorMsg));
                  continue; // Skip this value, but continue with other values
                }
              }

              // Insert each value (deduped by ON CONFLICT)
              pending.push(
                db.sequelize.query(
                  `INSERT INTO product_filters (product_id, filter_field_id, filter_value)
                   VALUES (:product_id, :filter_field_id, :filter_value)
                   ON CONFLICT (product_id, filter_field_id, filter_value) DO NOTHING`,
                  {
                    replacements: {
                      product_id,
                      filter_field_id,
                      filter_value: val,
                    },
                    type: db.sequelize.QueryTypes.INSERT,
                  }
                )
                  .then(() => {
                    successRows.push({ product_id, filter_field_id, filter_value: val });
                  })
                  .catch(err => {
                    errorRows.push({ row, filter_value: val, reason: `Insert failed: ${err.message}` });
                    console.error(chalk.red(`Insert failed for product ${product_id}, field ${filter_field_id}, value "${val}": ${err.message}`));
                  })
              );
            }
          }
        } catch (err) {
          errorRows.push({ row, reason: `Error processing row: ${err.message}` });
          console.error(chalk.red('Error processing row:'), err.message);
        }
      })
        .on('end', async () => {
          try {
            // If there are validation errors, stop and reject with detailed error
            if (validationErrors.length > 0) {
              const errorMsg = `Import stopped: ${validationErrors.length} value(s) not found in filter_fields.`;
              console.error(chalk.red(errorMsg));
              console.error(chalk.yellow('Please add missing values to filter_fields first, then try again.'));
              
              reject({
                validationError: true,
                message: errorMsg,
                details: validationErrors,
                errorRows
              });
              return;
            }

            await Promise.all(pending);
            const ok = successRows.length;
            const bad = errorRows.length;
            if (bad === 0) {
              console.log(chalk.green(`CSV processed successfully. Inserted ${ok} product_filters.`));
            } else {
              console.log(chalk.yellow(`CSV finished with ${bad} errors. Successful inserts: ${ok}.`));
            }
            resolve({ successRows, errorRows });
          } catch (e) {
            reject(e);
          }
        })
        .on('error', (err) => {
          reject(err);
        });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = processProductFiltersCsvFile;
