const { normalizeNumericValue } = require('./filterTestUtils');

/** Ignore parsed inch values above this (guards mangled numbers like 240480). */
const MAX_REASONABLE_DIMENSION_INCHES = 500;

const KNOWN_PRICE_TIERS = new Set([0, 50, 500, 1000, 5000, 10000, 20000, 50000, 100000]);

/**
 * Collect finite numeric values for a field across Excel products.
 * @param {object[]} products
 * @param {string} field
 */
function collectNumericFieldValues(products, field) {
  const values = [];
  for (const row of products) {
    const raw = row[field];
    if (raw == null || raw === '') continue;
    const n = normalizeNumericValue(raw);
    if (Number.isFinite(n)) values.push(n);
  }
  return values;
}

/**
 * Unique sorted numeric values.
 * @param {object[]} products
 * @param {string} field
 * @param {{ max?: number }} [opts]
 */
function uniqueNumericValues(products, field, opts = {}) {
  const max = opts.max ?? Infinity;
  return [...new Set(collectNumericFieldValues(products, field))]
    .filter((n) => n > 0 && n <= max)
    .sort((a, b) => a - b);
}

/**
 * Display Width/Height inch values within a plausible range for API range tests.
 * @param {object[]} products
 * @param {string} field
 */
function uniqueReasonableDimensionValues(products, field) {
  return uniqueNumericValues(products, field, {
    max: MAX_REASONABLE_DIMENSION_INCHES,
  });
}

/**
 * Pivot-style export (filter_field_id_* columns) stores price tiers in Product_Price,
 * not products.product_price — API price-range tests do not apply.
 * @param {object[]|{ headers?: string[], products?: object[] }} loadedOrProducts
 */
function excelProductPriceIsTierColumn(loadedOrProducts) {
  const headers = loadedOrProducts.headers || [];
  if (headers.some((h) => /^filter_field_id_\d+$/i.test(String(h)))) {
    return true;
  }

  const products = loadedOrProducts.products || loadedOrProducts;
  let tierCount = 0;
  let withValue = 0;
  for (const row of products) {
    const v = normalizeNumericValue(row.Product_Price);
    if (!Number.isFinite(v)) continue;
    withValue += 1;
    if (KNOWN_PRICE_TIERS.has(v)) tierCount += 1;
  }
  if (!withValue) return true;
  return tierCount / withValue >= 0.15;
}

/**
 * Pick min, max, and evenly spaced representative values (default 5 total).
 * @param {number[]} sortedUnique
 * @param {number} [targetCount]
 */
function selectRepresentativeNumericValues(sortedUnique, targetCount = 5) {
  if (!sortedUnique.length) return [];
  const sorted = [...sortedUnique].sort((a, b) => a - b);
  if (sorted.length <= targetCount) return sorted;

  const picked = new Set([sorted[0], sorted[sorted.length - 1]]);
  const middleSlots = targetCount - 2;
  for (let i = 1; i <= middleSlots; i++) {
    const idx = Math.round((i / (middleSlots + 1)) * (sorted.length - 1));
    picked.add(sorted[idx]);
  }
  return [...picked].sort((a, b) => a - b);
}

/**
 * Build inclusive price range buckets (API: product_price BETWEEN min AND max).
 * Only returns buckets that contain at least one Excel product.
 * @param {object[]} products
 */
function buildPriceRangeBuckets(products) {
  const prices = uniqueNumericValues(products, 'Product_Price');
  if (!prices.length) return [];

  const dataMax = prices[prices.length - 1];
  /** @type {Array<{ label: string, min: number, max: number }>} */
  const templates = [
    { label: '0-500', min: 0, max: 500 },
    { label: '500-1000', min: 500, max: 1000 },
    { label: '1000-5000', min: 1000, max: 5000 },
    { label: '5000-10000', min: 5000, max: 10000 },
    { label: '10000+', min: 10000, max: Number.MAX_SAFE_INTEGER },
  ];

  return templates.filter((b) => {
    if (b.min > dataMax) return false;
    return products.some((p) => {
      const price = normalizeNumericValue(p.Product_Price);
      return Number.isFinite(price) && price >= b.min && price <= b.max;
    });
  });
}

module.exports = {
  MAX_REASONABLE_DIMENSION_INCHES,
  collectNumericFieldValues,
  uniqueNumericValues,
  uniqueReasonableDimensionValues,
  excelProductPriceIsTierColumn,
  selectRepresentativeNumericValues,
  buildPriceRangeBuckets,
};
