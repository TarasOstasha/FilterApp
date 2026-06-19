const { expect } = require('chai');
const { visibleProductCodesOnly } = require('./filterTestUtils');
const { productHasCategoryId } = require('./excelCategoryLoader');

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

module.exports = {
  expectedProductCodesForCategory,
  assertProductsBelongToCategory,
};
