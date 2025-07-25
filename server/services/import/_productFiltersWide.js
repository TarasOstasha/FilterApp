// services/import/_productFiltersWide.js
const { ProductFilter } = require('../../models');

async function handleWideRow(row) {
  const pid = parseInt(row.product_id, 10);
  if (!pid) return 0;

  let inserted = 0;
  // Use a for-of so we can await inline
  for (const col of Object.keys(row)) {
    const m = col.match(/^filter_field_(\d+)$/);
    if (!m) continue;

    const idx = m[1];
    const ff  = parseInt(row[col], 10);
    const fv  = row[`filter_value_${idx}`]?.trim();
    if (!ff || !fv) continue;

    await ProductFilter.upsert({
      product_id:      pid,
      filter_field_id: ff,
      filter_value:    fv
    });
    inserted++;
  }

  return inserted;
}

module.exports = handleWideRow;
