/**
 * Compare Excel atomic filter tokens vs product_filters in the test database.
 * Run from server/: node qa-tests/scripts/compareExcelDb.js
 */
require('../setup');

const path = require('path');
const { Sequelize, QueryTypes } = require('sequelize');
const config = require('../../config/config.js')[process.env.NODE_ENV || 'test'];
const {
  loadExcelProducts,
  buildLoadSummary,
  collectUniqueAtomicValues,
  CHECKBOX_FIELDS,
  resolveExcelPath,
} = require('../helpers/excelProductLoader');

const API_FIELD_NAMES = {
  Product_Type: 'Product Type',
  Backlit: 'Backlit',
  Booth_Size: 'Booth Size',
};

async function main() {
  const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );

  const loaded = loadExcelProducts(resolveExcelPath());
  const excelAtomic = collectUniqueAtomicValues(loaded.products);

  const dbRows = await sequelize.query(
    `
    SELECT ff.field_name, pf.filter_value, COUNT(DISTINCT pf.product_id)::int AS product_count
    FROM product_filters pf
    JOIN filter_fields ff ON ff.id = pf.filter_field_id
    WHERE ff.field_name IN (:names)
      AND TRIM(pf.filter_value) <> ''
    GROUP BY ff.field_name, pf.filter_value
    ORDER BY ff.field_name, pf.filter_value
    `,
    {
      replacements: { names: Object.values(API_FIELD_NAMES) },
      type: QueryTypes.SELECT,
    }
  );

  /** @type {Record<string, Map<string, number>>} */
  const dbByField = {};
  for (const field of CHECKBOX_FIELDS) {
    dbByField[field] = new Map();
  }
  for (const row of dbRows) {
    const excelField = Object.entries(API_FIELD_NAMES).find(
      ([, api]) => api === row.field_name
    )?.[0];
    if (excelField) dbByField[excelField].set(row.filter_value, row.product_count);
  }

  console.log('\n=== Excel vs DB token comparison ===\n');
  console.log(`Excel: ${loaded.filePath}`);
  console.log(`DB: ${config.database}@${config.host}\n`);

  for (const field of CHECKBOX_FIELDS) {
    const excelTokens = new Set(excelAtomic[field]);
    const dbTokens = new Set(dbByField[field].keys());

    const onlyExcel = [...excelTokens].filter((t) => !dbTokens.has(t)).sort();
    const onlyDb = [...dbTokens].filter((t) => !excelTokens.has(t)).sort();
    const shared = [...excelTokens].filter((t) => dbTokens.has(t)).sort();

    console.log(`--- ${field} (API: ${API_FIELD_NAMES[field]}) ---`);
    console.log(`  Excel atomic tokens: ${excelTokens.size}`);
    console.log(`  DB filter_value tokens: ${dbTokens.size}`);
    console.log(`  In both: ${shared.length}`);
    console.log(`  Excel only (${onlyExcel.length}): ${onlyExcel.slice(0, 15).join(' | ')}${onlyExcel.length > 15 ? ' …' : ''}`);
    console.log(`  DB only (${onlyDb.length}): ${onlyDb.slice(0, 15).join(' | ')}${onlyDb.length > 15 ? ' …' : ''}`);

    let countMismatches = 0;
    for (const token of shared.slice(0, 50)) {
      const excelCount = loaded.products.filter(
        (p) => (p[`${field}_tokens`] || []).includes(token)
      ).length;
      const dbCount = dbByField[field].get(token) || 0;
      if (excelCount !== dbCount) {
        countMismatches += 1;
        if (countMismatches <= 5) {
          console.log(
            `  count mismatch "${token}": Excel products=${excelCount} DB products=${dbCount}`
          );
        }
      }
    }
    if (countMismatches > 5) {
      console.log(`  … and ${countMismatches - 5} more count mismatches`);
    }
    console.log('');
  }

  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
