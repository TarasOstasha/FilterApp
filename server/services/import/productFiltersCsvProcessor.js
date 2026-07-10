const chalk = require('chalk');
const fs = require('fs');
const csv = require('csv-parser');
const { Op } = require('sequelize');
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

const parseProductCode = (row) => String(row.product_code ?? '').trim();

const normalizeProductCodeKey = (code) => String(code ?? '').trim().toUpperCase();

/**
 * Batch-resolve product_code → { id, product_code } (case-insensitive, trimmed).
 * @param {string[]} codes
 * @returns {Promise<Map<string, { id: number, product_code: string }>>}
 */
const fetchProductIdsByCode = async (codes) => {
  const uniqueCodes = [...new Set(codes.map((code) => String(code).trim()).filter(Boolean))];
  if (uniqueCodes.length === 0) return new Map();

  const upperCodes = uniqueCodes.map((code) => normalizeProductCodeKey(code));

  const products = await db.Product.findAll({
    where: db.sequelize.where(
      db.sequelize.fn('upper', db.sequelize.fn('trim', db.sequelize.col('product_code'))),
      { [Op.in]: upperCodes }
    ),
    attributes: ['id', 'product_code'],
    raw: true,
  });

  const productIdByCode = new Map();
  for (const product of products) {
    const key = normalizeProductCodeKey(product.product_code);
    if (!key) continue;
    productIdByCode.set(key, {
      id: product.id,
      product_code: String(product.product_code).trim(),
    });
  }

  return productIdByCode;
};

/**
 * Resolve product_id from product_id and/or product_code on a CSV row.
 * @param {object} row
 * @param {Map<string, { id: number, product_code: string }>} productIdByCode
 */
const resolveProductIdentity = (row, productIdByCode) => {
  const product_code = parseProductCode(row);
  const { product_id: parsedId, productIdRaw } = parseProductId(row);

  if (parsedId && product_code) {
    const entry = productIdByCode.get(normalizeProductCodeKey(product_code));
    if (!entry) {
      return {
        product_id: null,
        product_code,
        product_id_raw: productIdRaw,
        reason: `Product not found for product_code "${product_code}"`,
      };
    }
    if (entry.id !== parsedId) {
      return {
        product_id: null,
        product_code,
        product_id_raw: productIdRaw,
        reason: `product_id ${parsedId} does not match product_code "${product_code}" (database id is ${entry.id})`,
      };
    }
    return { product_id: parsedId, product_code: entry.product_code };
  }

  if (parsedId) {
    return { product_id: parsedId, product_code };
  }

  if (!product_code) {
    return {
      product_id: null,
      product_code: '',
      product_id_raw: productIdRaw ?? '',
      reason: 'Missing product_code (provide product_code or a valid product_id)',
    };
  }

  const entry = productIdByCode.get(normalizeProductCodeKey(product_code));
  if (!entry) {
    return {
      product_id: null,
      product_code,
      reason: `Product not found for product_code "${product_code}"`,
    };
  }

  return { product_id: entry.id, product_code: entry.product_code };
};

const collectFilterValuesForRow = (row, product_id, idToValueCol, filterFieldMap) => {
  /** @type {Map<number, { values: string[] }>} */
  const touchedFields = new Map();
  const validationErrors = [];
  const rowErrors = [];

  for (const { idCol, valueCol, idNumber } of idToValueCol) {
    let filter_field_id = parseInt(row[idCol], 10);
    if (!filter_field_id || Number.isNaN(filter_field_id)) {
      filter_field_id = idNumber;
    }

    const rawValue = String(row[valueCol] ?? '').trim();

    if (!rawValue) {
      touchedFields.set(filter_field_id, { values: [] });
      continue;
    }

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

    const acceptedValues = [];
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

      acceptedValues.push(val);
    }

    touchedFields.set(filter_field_id, { values: acceptedValues });
  }

  return { touchedFields, validationErrors, rowErrors };
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

/**
 * Apply all product filter changes in a single DB transaction.
 * @param {Map<number, Map<number, { values: string[] }>>} filtersByProduct
 * @param {import('pg').Pool} [poolInstance]
 */
const importAllProductFiltersInTransaction = async (filtersByProduct, poolInstance = pool) => {
  const client = await poolInstance.connect();
  const successRows = [];
  let inserted = 0;

  try {
    await client.query('BEGIN');

    for (const [product_id, touchedFields] of filtersByProduct.entries()) {
      for (const [filter_field_id, { values }] of touchedFields.entries()) {
        await client.query(
          'DELETE FROM product_filters WHERE product_id = $1 AND filter_field_id = $2',
          [product_id, filter_field_id]
        );

        if (values.length > 0) {
          const inserts = values.map((filter_value) => ({ filter_field_id, filter_value }));
          await batchInsertProductFilters(client, product_id, inserts);
          inserted += inserts.length;

          for (const filter_value of values) {
            successRows.push({ product_id, filter_field_id, filter_value });
          }
        }
      }
    }

    await client.query('COMMIT');
    return { inserted, successRows };
  } catch (err) {
    await client.query('ROLLBACK');
    throw {
      importError: true,
      message: `Product filters import rolled back: ${err.message || String(err)}`,
      cause: err,
    };
  } finally {
    client.release();
  }
};

/**
 * Import pivot-style product filters CSV:
 * product_code (required), product_id (optional), (filter_field_id_X, <Field Name>), ...
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
                console.log(
                  chalk.blue(
                    `Detected ${idToValueCol.length} filter field column(s) in file — only these fields will be updated per product.`
                  )
                );
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

        const dataRows = csvRows.filter((row) => !isBlankPivotRow(row));
        const blankRowsSkipped = csvRows.length - dataRows.length;
        const productIdByCode = await fetchProductIdsByCode(
          dataRows.map((row) => parseProductCode(row)).filter(Boolean)
        );

        /** @type {Map<number, Map<number, { values: string[] }>>} */
        const filtersByProduct = new Map();
        const errorRows = [];
        const validationErrors = [];

        for (const row of dataRows) {
          const {
            product_id,
            product_code,
            product_id_raw: productIdRaw,
            reason: identityReason,
          } = resolveProductIdentity(row, productIdByCode);

          if (!product_id) {
            errorRows.push({
              product_code: product_code || parseProductCode(row),
              product_id: productIdRaw ?? '',
              reason: identityReason || 'Missing or invalid product identity',
            });
            console.error(
              chalk.red(
                `Invalid product identity (product_code=${product_code || 'n/a'}): ${identityReason || 'unknown error'}`
              )
            );
            continue;
          }

          const { touchedFields, validationErrors: rowValidation, rowErrors } =
            collectFilterValuesForRow(row, product_id, idToValueCol, filterFieldMap);

          if (rowValidation.length > 0) {
            validationErrors.push(...rowValidation);
          }
          if (rowErrors.length > 0) {
            errorRows.push(...rowErrors.map((e) => ({ product_id, ...e, row })));
          }

          if (!filtersByProduct.has(product_id)) {
            filtersByProduct.set(product_id, new Map());
          }

          const fieldMap = filtersByProduct.get(product_id);
          for (const [filter_field_id, entry] of touchedFields.entries()) {
            fieldMap.set(filter_field_id, entry);
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

        if (errorRows.length > 0) {
          const errorMsg = `Import stopped: ${errorRows.length} row(s) failed validation.`;
          console.error(chalk.red(errorMsg));
          reject({
            validationError: true,
            message: errorMsg,
            details: errorRows,
            errorRows,
          });
          return;
        }

        const productIds = Array.from(filtersByProduct.keys());
        console.log(
          chalk.blue(
            `Importing product_filters for ${productIds.length} product(s) in a single transaction...`
          )
        );

        const { successRows } = await importAllProductFiltersInTransaction(filtersByProduct);

        if (blankRowsSkipped > 0) {
          console.log(
            chalk.gray(`Skipped ${blankRowsSkipped} blank row(s) at end of file (no product_code or product_id).`)
          );
        }

        console.log(
          chalk.green(`CSV processed successfully. Inserted ${successRows.length} product_filters.`)
        );

        resolve({ successRows, errorRows: [], blankRowsSkipped });
      } catch (err) {
        if (err.importError) {
          console.error(chalk.red(err.message));
        }
        reject(err);
      }
    })();
  });
};

module.exports = processProductFiltersCsvFile;
module.exports.importAllProductFiltersInTransaction = importAllProductFiltersInTransaction;
module.exports.collectFilterValuesForRow = collectFilterValuesForRow;
module.exports.resolveProductIdentity = resolveProductIdentity;
module.exports.fetchProductIdsByCode = fetchProductIdsByCode;
