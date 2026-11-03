/**
 * Product Price is a range slider backed by products.product_price.
 * Breakpoints live on filter_fields.allowed_values — not product_filters rows.
 */
const PRODUCT_PRICE_FIELD_NAME = 'Product Price';

function isProductPriceFieldName(name) {
  return String(name || '').trim() === PRODUCT_PRICE_FIELD_NAME;
}

/** Fields included in product_filters import/export (excludes Product Price). */
function filterFieldsForProductFilterIo(fields) {
  return (fields || []).filter((f) => !isProductPriceFieldName(f.field_name));
}

module.exports = {
  PRODUCT_PRICE_FIELD_NAME,
  isProductPriceFieldName,
  filterFieldsForProductFilterIo,
};
