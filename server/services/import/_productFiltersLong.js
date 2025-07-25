// services/import/_productFiltersLong.js
const { ProductFilter } = require('../../models');

async function handleLongRow(row) {
  const pi = parseInt(row.product_id,      10);
  const ff = parseInt(row.filter_field_id, 10);
  const fv = row.filter_value?.trim();

  if (!pi || !ff || !fv) {
    // returning false signals “skipped”
    return false;
  }

  await ProductFilter.upsert({
    product_id:      pi,
    filter_field_id: ff,
    filter_value:    fv
  });
  return true;
}

module.exports = handleLongRow;
