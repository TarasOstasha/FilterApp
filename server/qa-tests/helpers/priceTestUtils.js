const {
  normalizeNumericValue,
  expectedProductCodesForMultiFilter,
  buildApiQueryMulti,
} = require('./filterTestUtils');
const { selectRepresentativeNumericValues } = require('./sampleValueSelector');

/** Standard API price buckets (inclusive BETWEEN). */
const PRICE_BUCKET_TEMPLATES = [
  { label: '0-500', min: 0, max: 500 },
  { label: '500-1000', min: 500, max: 1000 },
  { label: '1000-5000', min: 1000, max: 5000 },
  { label: '5000-10000', min: 5000, max: 10000 },
  { label: '10000+', min: 10000, max: Number.MAX_SAFE_INTEGER },
];

/**
 * @param {Array<{ product_code: string, product_price: number }>} catalog
 * @param {number} min
 * @param {number} max
 * @returns {Set<string>}
 */
function expectedProductCodesForCatalogPriceRange(catalog, min, max) {
  const codes = new Set();
  for (const row of catalog) {
    const price = normalizeNumericValue(row.product_price);
    if (!Number.isFinite(price)) continue;
    if (price >= min && price <= max) codes.add(row.product_code);
  }
  return codes;
}

/**
 * @param {Array<{ product_code: string, product_price: number }>} catalog
 * @returns {Array<{ label: string, min: number, max: number }>}
 */
function buildPriceRangeBucketsFromCatalog(catalog) {
  if (!catalog.length) return [];

  const prices = catalog
    .map((r) => normalizeNumericValue(r.product_price))
    .filter((n) => Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b);
  if (!prices.length) return [];

  const dataMax = prices[prices.length - 1];

  return PRICE_BUCKET_TEMPLATES.filter((bucket) => {
    if (bucket.min > dataMax) return false;
    return catalog.some((row) => {
      const price = normalizeNumericValue(row.product_price);
      return Number.isFinite(price) && price >= bucket.min && price <= bucket.max;
    });
  });
}

/**
 * @param {Array<{ product_code: string, product_price: number }>} catalog
 * @param {number} [targetCount]
 * @returns {number[]}
 */
function selectRepresentativeCatalogPrices(catalog, targetCount = 5) {
  const unique = [
    ...new Set(
      catalog
        .map((r) => normalizeNumericValue(r.product_price))
        .filter((n) => Number.isFinite(n) && n > 0)
    ),
  ].sort((a, b) => a - b);

  return selectRepresentativeNumericValues(unique, targetCount);
}

/**
 * @param {object[]} apiProducts
 * @param {number} min
 * @param {number} max
 */
function assertApiProductsSatisfyCatalogPriceRange(apiProducts, min, max) {
  const { expect } = require('chai');
  for (const product of apiProducts) {
    const price = normalizeNumericValue(product.product_price);
    const code = String(product.product_code ?? '').trim();
    expect(price, `${code} price`).to.be.at.least(min);
    expect(price, `${code} price`).to.be.at.most(max);
  }
}

/**
 * Checkbox multi-filter (Excel) AND catalog price range (DB product_price).
 * @param {object[]} excelProducts
 * @param {Record<string, string | string[]>} filterSpecs
 * @param {Array<{ product_code: string, product_price: number }>} catalog
 * @param {number} min
 * @param {number} max
 * @returns {Set<string>}
 */
function expectedProductCodesForMultiFilterAndCatalogPrice(
  excelProducts,
  filterSpecs,
  catalog,
  min,
  max
) {
  const fromFilters = expectedProductCodesForMultiFilter(excelProducts, filterSpecs);
  const fromPrice = expectedProductCodesForCatalogPriceRange(catalog, min, max);
  return new Set([...fromFilters].filter((code) => fromPrice.has(code)));
}

/**
 * @param {Record<string, string | string[]>} filterSpecs
 * @param {number} min
 * @param {number} max
 */
function buildApiQueryMultiWithCatalogPrice(filterSpecs, min, max) {
  return buildApiQueryMulti({
    ...filterSpecs,
    Product_Price: { min, max },
  });
}

module.exports = {
  PRICE_BUCKET_TEMPLATES,
  expectedProductCodesForCatalogPriceRange,
  expectedProductCodesForMultiFilterAndCatalogPrice,
  buildPriceRangeBucketsFromCatalog,
  selectRepresentativeCatalogPrices,
  assertApiProductsSatisfyCatalogPriceRange,
  buildApiQueryMultiWithCatalogPrice,
};
