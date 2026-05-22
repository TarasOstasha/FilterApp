const chalk = require('chalk');
const fs = require('fs');
const csv = require('csv-parser');
const db = require('../../models');
const pool = require('../../config/dbConfig');

const INSERT_CHUNK_SIZE = 500;

function normalizePriceValues(raw) {
  if (!raw) return [];
  const s = String(raw).trim();

  if (/^\d+(,\d+)+$/.test(s)) {
    return s.split(',').map((v) => v.trim()).filter(Boolean);
  }

  if (/^\d{2},\d{3},\d{3}$/.test(s)) {
    const digits = s.replace(/,/g, '');
    return [digits.slice(0, 4), digits.slice(4)];
  }

  if (/^\d{1},\d{3},\d{3}$/.test(s)) {
    const digits = s.replace(/,/g, '');
    return [digits.slice(0, digits.length - 3), digits.slice(-3)];
  }

  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    return [s.replace(/,/g, '')];
  }

  return s
    .split(/[,|\s]+/)
    .map((v) => v.trim().replace(/[^\d.]/g, ''))
    .filter(Boolean);
}

const getProductIdKey = (row) =>
  Object.keys(row).find((k) => k.trim() === 'product_id' || k.trim().endsWith('product_id'));

const isBlankPivotRow = (row) => {
  const productIdKey = getProductIdKey(row);
  const productIdRaw = String(productIdKey ? row[productIdKey] ?? '' : '').trim();
  const productCodeRaw = String(row.product_code ?? '').trim();
  if (productIdRaw || productCodeRaw) return false;
  return Object.values(row).every((v) => String(v ?? '').trim() === '');
};

const parseProductId = (row) => {
  const keys = Object.keys(row);
  const productIdKey = getProductIdKey(row);
  let productIdRaw = productIdKey ? row[productIdKey] : row.product || row[' product_id'];

  if (productIdRaw !== undefined && productIdRaw !== null && productIdRaw !== '') {
    productIdRaw = String(productIdRaw).trim();
  }

  const product_id = parseInt(productIdRaw, 10);
  if (!productIdRaw || Number.isNaN(product_id) || product_id <= 0) {
    return { product_id: null, productIdKey, productIdRaw, keys };
  }

  return { product_id, productIdKey, productIdRaw, keys };
};

const collectFilterValuesForRow = (row, product_id, idToValueCol, filterFieldMap) => {
  const inserts = [];
  const validationErrors = [];
  const rowErrors = [];

  for (const { idCol, valueCol, idNumber } of idToValueCol) {
    const filter_field_id = parseInt(row[idCol], 10);
    if (!filter_field_id || Number.isNaN(filter_field_id)) continue;

    const rawValue = String(row[valueCol] ?? '').trim();
    if (!rawValue) continue;

    let values = [];
    if (filter_field_id === 1) {
      values = normalizePriceValues(rawValue);
    } else {
      values = rawValue.split(',').map((v) => v.trim()).filter(Boolean);
    }

    const fieldInfo = filterFieldMap.get(filter_field_id);
    if (!fieldInfo) {
      const errorMsg = `Filter field ID ${filter_field_id} does not exist in filter_fields table.`;
      validationErrors.push({
        product_id,
        filter_field_id,
        field_name: valueCol,
        error: errorMsg,
      });
      rowErrors.push({ reason: errorMsg });
      continue;
    }

    const seenValues = new Set();
    for (const val of values) {
      if (seenValues.has(val)) continue;
      seenValues.add(val);

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
            error: errorMsg,
          });
          rowErrors.push({ filter_value: val, reason: errorMsg });
          continue;
        }
      }

      inserts.push({ filter_field_id, filter_value: val });
    }
  }

  return { inserts, validationErrors, rowErrors };
};

const batchInsertProductFilters = async (client, product_id, inserts) => {
  for (let i = 0; i < inserts.length; i += INSERT_CHUNK_SIZE) {
    const chunk = inserts.slice(i, i + INSERT_CHUNK_SIZE);
    const values = [];
    const placeholders = chunk.map((entry, idx) => {
      const base = idx * 3 + 1;
      values.push(product_id, entry.filter_field_id, entry.filter_value);
      return `($${base}, $${base + 1}, $${base + 2})`;
    });

    await client.query(
      `INSERT INTO product_filters (product_id, filter_field_id, filter_value)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (product_id, filter_field_id, filter_value) DO NOTHING`,
      values
    );
  }
};

const importFiltersForProduct = async (product_id, inserts) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM product_filters WHERE product_id = $1', [product_id]);

    if (inserts.length > 0) {
      await batchInsertProductFilters(client, product_id, inserts);
    }

    await client.query('COMMIT');
    return { inserted: inserts.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Import pivot-style product filters CSV:
 * product_id, product_code, (filter_field_id_X, <Field Name>), ...
 */
const processProductFiltersCsvFile = (csvFilePath) => {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        const filterFields = await db.FilterField.findAll({
          attributes: ['id', 'field_name', 'allowed_values', 'field_type'],
          raw: true,
        });

        const filterFieldMap = new Map();
        for (const field of filterFields) {
          const allowedValuesArray = field.allowed_values
            ? field.allowed_values.split(',').map((v) => v.trim().toLowerCase())
            : [];
          filterFieldMap.set(field.id, {
            field_name: field.field_name,
            allowed_values_set: new Set(allowedValuesArray),
            field_type: field.field_type,
          });
        }

        const csvRows = [];
        const idToValueCol = [];
        let headersParsed = false;

        await new Promise((streamResolve, streamReject) => {
          fs.createReadStream(csvFilePath)
            .pipe(
              csv({
                mapHeaders: ({ header }) => header,
              })
            )
            .on('headers', (headers) => {
              for (let i = 0; i < headers.length; i++) {
                const h = headers[i];
                const m = /^filter_field_id_(\d+)$/.exec(h);
                if (m) {
                  const valueCol = headers[i + 1];
                  if (!valueCol) {
                    console.warn(chalk.yellow(`No value column after ${h}; skipping this field id.`));
                    continue;
                  }
                  idToValueCol.push({ idCol: h, valueCol, idNumber: parseInt(m[1], 10) });
                }
              }

              if (idToValueCol.length === 0) {
                console.error(chalk.red('No filter_field_id_* columns detected. Is this the new pivot CSV?'));
              } else {
                console.log(chalk.blue(`Detected ${idToValueCol.length} filter fields from header.`));
              }
              headersParsed = true;
            })
            .on('data', (row) => csvRows.push(row))
            .on('end', streamResolve)
            .on('error', streamReject);
        });

        if (!headersParsed || idToValueCol.length === 0) {
          reject(new Error('Invalid product_filters CSV: missing filter_field_id_* columns'));
          return;
        }

        const filtersByProduct = new Map();
        const errorRows = [];
        const validationErrors = [];
        let blankRowsSkipped = 0;

        for (const row of csvRows) {
          if (isBlankPivotRow(row)) {
            blankRowsSkipped += 1;
            continue;
          }

          const { product_id, productIdKey, productIdRaw, keys } = parseProductId(row);

          if (!product_id) {
            const product_code = String(row.product_code ?? '').trim();
            errorRows.push({
              product_code,
              product_id: productIdRaw ?? '',
              reason: 'Missing or invalid product_id',
            });
            console.error(
              chalk.red(
                `Missing product_id (product_code=${product_code || 'n/a'}): ${JSON.stringify(row)}`
              )
            );
            continue;
          }

          const { inserts, validationErrors: rowValidation, rowErrors } = collectFilterValuesForRow(
            row,
            product_id,
            idToValueCol,
            filterFieldMap
          );

          if (rowValidation.length > 0) {
            validationErrors.push(...rowValidation);
          }
          if (rowErrors.length > 0) {
            errorRows.push(...rowErrors.map((e) => ({ product_id, ...e, row })));
          }

          if (!filtersByProduct.has(product_id)) {
            filtersByProduct.set(product_id, []);
          }

          const existing = filtersByProduct.get(product_id);
          const dedupe = new Set(existing.map((e) => `${e.filter_field_id}|${e.filter_value}`));
          for (const entry of inserts) {
            const key = `${entry.filter_field_id}|${entry.filter_value}`;
            if (!dedupe.has(key)) {
              dedupe.add(key);
              existing.push(entry);
            }
          }
        }

        if (validationErrors.length > 0) {
          const errorMsg = `Import stopped: ${validationErrors.length} value(s) not found in filter_fields.`;
          console.error(chalk.red(errorMsg));
          reject({
            validationError: true,
            message: errorMsg,
            details: validationErrors,
            errorRows,
          });
          return;
        }

        const successRows = [];
        const productIds = Array.from(filtersByProduct.keys());
        console.log(chalk.blue(`Importing product_filters for ${productIds.length} product(s)...`));

        for (let i = 0; i < productIds.length; i++) {
          const product_id = productIds[i];
          const inserts = filtersByProduct.get(product_id) || [];

          try {
            await importFiltersForProduct(product_id, inserts);
            for (const entry of inserts) {
              successRows.push({
                product_id,
                filter_field_id: entry.filter_field_id,
                filter_value: entry.filter_value,
              });
            }
            if ((i + 1) % 100 === 0 || i === productIds.length - 1) {
              console.log(chalk.gray(`Processed ${i + 1}/${productIds.length} products`));
            }
          } catch (err) {
            const reason = err.message || String(err);
            errorRows.push({ product_id, reason: `Failed to import filters: ${reason}` });
            console.error(chalk.red(`Failed product ${product_id}: ${reason}`));
          }
        }

        const ok = successRows.length;
        const bad = errorRows.length;
        if (blankRowsSkipped > 0) {
          console.log(
            chalk.gray(`Skipped ${blankRowsSkipped} blank row(s) at end of file (no product_id/product_code).`)
          );
        }
        if (bad === 0) {
          console.log(chalk.green(`CSV processed successfully. Inserted ${ok} product_filters.`));
        } else {
          console.log(chalk.yellow(`CSV finished with ${bad} errors. Successful inserts: ${ok}.`));
        }

        resolve({ successRows, errorRows, blankRowsSkipped });
      } catch (err) {
        reject(err);
      }
    })();
  });
};

module.exports = processProductFiltersCsvFile;
