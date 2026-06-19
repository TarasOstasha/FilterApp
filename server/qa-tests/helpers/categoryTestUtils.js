const { expect } = require('chai');
const {
  visibleProductCodesOnly,
  expectedProductCodesForFilter,
  expectedProductCodesForMultiFilter,
} = require('./filterTestUtils');
const { productHasCategoryId } = require('./excelCategoryLoader');

/**
 * @param {Set<string>} a
 * @param {Set<string>} b
 */
function intersectProductCodeSets(a, b) {
  return new Set([...a].filter((c) => b.has(c)));
}

/**
 * Expected visible product_codes assigned to a category in the fixture.
 * @param {object[]} categoryProducts
 * @param {string|number} categoryId
 */
function expectedProductCodesForCategory(categoryProducts, categoryId) {
  const codes = new Set();
  for (const row of categoryProducts) {
    if (productHasCategoryId(row, categoryId)) codes.add(row.product_code);
  }
  return visibleProductCodesOnly(codes);
}

/**
 * Each API product must belong to the category in the Excel fixture.
 * @param {object[]} apiProducts
 * @param {string|number} categoryId
 * @param {Map<string, object>} excelByCode
 */
function assertProductsBelongToCategory(apiProducts, categoryId, excelByCode) {
  const target = String(categoryId).trim();

  for (const product of apiProducts) {
    const code = String(product.product_code ?? '').trim();
    const excelRow = excelByCode.get(code);
    if (!excelRow) continue;

    expect(
      productHasCategoryId(excelRow, target),
      `${code} should include category_id ${target} (category_ids="${excelRow.category_ids}")`
    ).to.equal(true);
  }
}

/**
 * Products in category AND matching a single filter value.
 */
function expectedProductCodesForCategoryAndFilter(
  filterProducts,
  categoryProducts,
  categoryId,
  field,
  filterValue
) {
  const categoryCodes = expectedProductCodesForCategory(categoryProducts, categoryId);
  const filterCodes = expectedProductCodesForFilter(filterProducts, field, filterValue);
  return intersectProductCodeSets(categoryCodes, filterCodes);
}

/**
 * Products in category AND matching all multi-filter specs (AND).
 */
function expectedProductCodesForCategoryAndMultiFilter(
  filterProducts,
  categoryProducts,
  categoryId,
  filterSpecs
) {
  const categoryCodes = expectedProductCodesForCategory(categoryProducts, categoryId);
  const filterCodes = expectedProductCodesForMultiFilter(filterProducts, filterSpecs);
  return intersectProductCodeSets(categoryCodes, filterCodes);
}

/**
 * @param {string|number} categoryId
 * @param {Record<string, string|string[]>} filterQuery
 */
function buildApiQueryWithCategory(categoryId, filterQuery) {
  return { catId: String(categoryId), ...filterQuery };
}

module.exports = {
  intersectProductCodeSets,
  expectedProductCodesForCategory,
  expectedProductCodesForCategoryAndFilter,
  expectedProductCodesForCategoryAndMultiFilter,
  assertProductsBelongToCategory,
  buildApiQueryWithCategory,
};
