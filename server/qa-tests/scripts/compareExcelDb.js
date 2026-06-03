/**
 * Compare Excel atomic filter tokens vs product_filters in the test database.
 * Run from server/: npm run test:compare-excel-db
 */
require('../setup');

const { Sequelize, QueryTypes } = require('sequelize');
const config = require('../../config/config.js')[process.env.NODE_ENV || 'test'];
const {
  loadExcelProducts,
  collectUniqueAtomicValues,
  CHECKBOX_FIELDS,
  resolveExcelPath,
} = require('../helpers/excelProductLoader');
const { CHECKBOX_API_FIELD_NAMES } = require('../helpers/filterTestUtils');

async function main() {
  const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );

  const loaded = loadExcelProducts(resolveExcelPath());
  const excelAtomic = collectUniqueAtomicValues(loaded.products);

  const apiNames = Object.values(CHECKBOX_API_FIELD_NAMES);
  const dbFieldRows = await sequelize.query(
    `SELECT id, field_name, field_type FROM filter_fields WHERE field_name IN (:names) ORDER BY field_name`,
    { replacements: { names: apiNames }, type: QueryTypes.SELECT }
  );
  const dbFieldByApiName = new Map(dbFieldRows.map((r) => [r.field_name, r]));

  console.log('\n=== API field name mapping (Excel → filter_fields) ===\n');
  let mappingMismatches = 0;
  for (const field of CHECKBOX_FIELDS) {
    const apiName = CHECKBOX_API_FIELD_NAMES[field];
    const row = dbFieldByApiName.get(apiName);
    if (!row) {
      mappingMismatches += 1;
      console.log(`  MISSING in DB: ${field} → "${apiName}"`);
    } else if (row.field_type !== 'checkbox') {
      mappingMismatches += 1;
      console.log(
        `  TYPE mismatch: ${field} → "${apiName}" (DB type=${row.field_type}, expected checkbox)`
      );
    }
  }
  if (!mappingMismatches) {
    console.log(`  All ${CHECKBOX_FIELDS.length} checkbox fields resolved in filter_fields.`);
  }

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
      replacements: { names: apiNames },
      type: QueryTypes.SELECT,
    }
  );

  /** @type {Record<string, Map<string, number>>} */
  const dbByField = {};
  for (const field of CHECKBOX_FIELDS) {
    dbByField[field] = new Map();
  }
  for (const row of dbRows) {
    const excelField = Object.entries(CHECKBOX_API_FIELD_NAMES).find(
      ([, api]) => api === row.field_name
    )?.[0];
    if (excelField) dbByField[excelField].set(row.filter_value, row.product_count);
  }

  console.log('\n=== Excel vs DB token comparison ===\n');
  console.log(`Excel: ${loaded.filePath}`);
  console.log(`DB: ${config.database}@${config.host}\n`);

  const skippedFields = [];
  /** @type {Record<string, { onlyExcel: string[], onlyDb: string[] }>} */
  const diffByField = {};

  for (const field of CHECKBOX_FIELDS) {
    const excelTokens = new Set(excelAtomic[field] || []);
    const dbTokens = new Set(dbByField[field].keys());

    if (!excelTokens.size) {
      skippedFields.push({ field, reason: 'no atomic tokens in Excel' });
      console.log(`--- ${field} (API: ${CHECKBOX_API_FIELD_NAMES[field]}) ---`);
      console.log('  skipped — no atomic tokens in Excel\n');
      continue;
    }

    const onlyExcel = [...excelTokens].filter((t) => !dbTokens.has(t)).sort();
    const onlyDb = [...dbTokens].filter((t) => !excelTokens.has(t)).sort();
    const shared = [...excelTokens].filter((t) => dbTokens.has(t)).sort();
    diffByField[field] = { onlyExcel, onlyDb };

    console.log(`--- ${field} (API: ${CHECKBOX_API_FIELD_NAMES[field]}) ---`);
    console.log(`  Excel atomic tokens: ${excelTokens.size}`);
    console.log(`  DB filter_value tokens: ${dbTokens.size}`);
    console.log(`  In both: ${shared.length}`);
    console.log(
      `  Excel only (${onlyExcel.length}): ${onlyExcel.slice(0, 15).join(' | ')}${onlyExcel.length > 15 ? ' …' : ''}`
    );
    console.log(
      `  DB only (${onlyDb.length}): ${onlyDb.slice(0, 15).join(' | ')}${onlyDb.length > 15 ? ' …' : ''}`
    );

    let countMismatches = 0;
    for (const token of shared.slice(0, 50)) {
      const excelCount = loaded.products.filter((p) =>
        (p[`${field}_tokens`] || []).includes(token)
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

  console.log('=== Summary ===');
  console.log(`Fields compared: ${CHECKBOX_FIELDS.length}`);
  console.log(`Fields skipped (empty Excel): ${skippedFields.length}`);
  if (skippedFields.length) {
    for (const s of skippedFields) {
      console.log(`  - ${s.field}: ${s.reason}`);
    }
  }
  console.log(`Field-name mapping issues: ${mappingMismatches}`);
  const totalExcelOnly = Object.values(diffByField).reduce((n, d) => n + d.onlyExcel.length, 0);
  const totalDbOnly = Object.values(diffByField).reduce((n, d) => n + d.onlyDb.length, 0);
  console.log(`Total Excel-only tokens (non-empty fields): ${totalExcelOnly}`);
  console.log(`Total DB-only tokens (non-empty fields): ${totalDbOnly}`);

  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
