/**
 * Export product_codes present in DB but not in the Excel QA fixture.
 * Run from server/: npm run export:db-only-products
 *
 * Output: qa-tests/output/db-only-product-codes.csv
 * Columns: product_code, product_name, product_price, then one column per filter_fields.field_name
 */
require('../setup');

const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const { Sequelize, QueryTypes } = require('sequelize');
const config = require('../../config/config.js')[process.env.NODE_ENV || 'test'];
const { loadExcelProducts, resolveExcelPath } = require('../helpers/excelProductLoader');

const DEFAULT_OUTPUT = path.resolve(__dirname, '../output/db-only-product-codes.csv');

function resolveOutputPath() {
  const configured = process.env.QA_DB_ONLY_EXPORT_PATH?.trim();
  if (!configured) return DEFAULT_OUTPUT;
  if (path.isAbsolute(configured)) return configured;
  return path.resolve(__dirname, '../..', configured);
}

/**
 * @param {Map<string, { product_code: string, product_name: string, product_price: string, filters: Map<string, Set<string>> }>} byCode
 * @param {string[]} filterFieldNames
 */
function rowsForCsv(byCode, filterFieldNames) {
  const sortedCodes = [...byCode.keys()].sort((a, b) => a.localeCompare(b));
  return sortedCodes.map((code) => {
    const row = byCode.get(code);
    const out = {
      product_code: row.product_code,
      product_name: row.product_name,
      product_price: row.product_price,
    };
    for (const fieldName of filterFieldNames) {
      const values = row.filters.get(fieldName);
      out[fieldName] = values ? [...values].sort((a, b) => a.localeCompare(b)).join(', ') : '';
    }
    return out;
  });
}

async function main() {
  const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );

  const loaded = loadExcelProducts(resolveExcelPath());
  const excelCodes = new Set(
    loaded.products.map((p) => String(p.product_code ?? '').trim()).filter(Boolean)
  );

  const dbCodeRows = await sequelize.query(
    `
    SELECT DISTINCT TRIM(product_code) AS product_code
    FROM products
    WHERE product_code IS NOT NULL AND TRIM(product_code) <> ''
    ORDER BY product_code
    `,
    { type: QueryTypes.SELECT }
  );

  const dbOnlyCodes = dbCodeRows
    .map((r) => String(r.product_code).trim())
    .filter((code) => code && !excelCodes.has(code));

  if (!dbOnlyCodes.length) {
    console.log('No DB-only product_codes (all DB codes exist in Excel fixture).');
    await sequelize.close();
    return;
  }

  const filterFields = await sequelize.query(
    `SELECT field_name FROM filter_fields ORDER BY sort_order NULLS LAST, id`,
    { type: QueryTypes.SELECT }
  );
  const filterFieldNames = filterFields.map((f) => f.field_name);

  const products = await sequelize.query(
    `
    SELECT id, TRIM(product_code) AS product_code, product_name, product_price
    FROM products
    WHERE TRIM(product_code) IN (:codes)
    ORDER BY product_code
    `,
    { replacements: { codes: dbOnlyCodes }, type: QueryTypes.SELECT }
  );

  /** @type {Map<string, object>} */
  const byCode = new Map();
  const productIds = [];

  for (const p of products) {
    const code = String(p.product_code).trim();
    productIds.push(p.id);
    byCode.set(code, {
      product_code: code,
      product_name: p.product_name != null ? String(p.product_name) : '',
      product_price: p.product_price != null ? String(p.product_price) : '',
      filters: new Map(),
    });
  }

  const missingFromDb = dbOnlyCodes.filter((c) => !byCode.has(c));
  if (missingFromDb.length) {
    console.warn(
      `Warning: ${missingFromDb.length} DB-only code(s) missing from products table query.`
    );
  }

  if (productIds.length) {
    const filterRows = await sequelize.query(
      `
      SELECT
        TRIM(p.product_code) AS product_code,
        ff.field_name,
        TRIM(pf.filter_value) AS filter_value
      FROM product_filters pf
      JOIN products p ON p.id = pf.product_id
      JOIN filter_fields ff ON ff.id = pf.filter_field_id
      WHERE p.id IN (:ids)
        AND TRIM(pf.filter_value) <> ''
      ORDER BY p.product_code, ff.sort_order NULLS LAST, ff.id, pf.filter_value
      `,
      { replacements: { ids: productIds }, type: QueryTypes.SELECT }
    );

    for (const r of filterRows) {
      const code = String(r.product_code).trim();
      const entry = byCode.get(code);
      if (!entry) continue;
      const fieldName = String(r.field_name);
      const value = String(r.filter_value).trim();
      if (!entry.filters.has(fieldName)) entry.filters.set(fieldName, new Set());
      entry.filters.get(fieldName).add(value);
    }
  }

  const csvRows = rowsForCsv(byCode, filterFieldNames);
  const fields = ['product_code', 'product_name', 'product_price', ...filterFieldNames];
  const csv = new Parser({ fields, header: true }).parse(csvRows);

  const outPath = resolveOutputPath();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, csv, 'utf8');

  console.log('\n=== DB-only product export ===\n');
  console.log(`Excel fixture: ${loaded.filePath}`);
  console.log(`Excel unique product_codes: ${excelCodes.size}`);
  console.log(`DB-only product_codes exported: ${csvRows.length}`);
  console.log(`Output: ${outPath}`);
  console.log(`Columns: ${fields.length} (${fields.slice(0, 3).join(', ')}, + ${filterFieldNames.length} filter fields)\n`);

  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
