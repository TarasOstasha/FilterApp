const { expect } = require('chai');
const { getTestAgent } = require('../helpers/testServer');
const {
  loadCategoryProducts,
  buildCategoryLoadSummary,
  formatCategoryLoadSummaryText,
  selectCategoryIdsForTest,
} = require('../helpers/excelCategoryLoader');
const {
  expectedProductCodesForCategory,
  assertProductsBelongToCategory,
} = require('../helpers/categoryTestUtils');
const { runFilterScenario } = require('../helpers/filterTestUtils');
const { bootstrapApiProductVisibility } = require('../helpers/apiTestBootstrap');

const loaded = loadCategoryProducts();
const summary = buildCategoryLoadSummary(loaded);
const { products: categoryProducts } = loaded;
const allCategoryIds = summary.uniqueCategoryIds;
const categoryIdsToTest = selectCategoryIdsForTest(allCategoryIds);
const excelByCode = new Map(categoryProducts.map((p) => [p.product_code, p]));

// eslint-disable-next-line no-console
console.log(`\n${formatCategoryLoadSummaryText(summary)}\n`);

if (process.env.QA_CATEGORY_IDS_TO_TEST?.trim()) {
  // eslint-disable-next-line no-console
  console.log(`QA_CATEGORY_IDS_TO_TEST: testing ${categoryIdsToTest.length} category(s)`);
} else if (process.env.QA_MAX_CATEGORIES_TO_TEST?.trim()) {
  // eslint-disable-next-line no-console
  console.log(
    `QA_MAX_CATEGORIES_TO_TEST=${process.env.QA_MAX_CATEGORIES_TO_TEST}: testing ${categoryIdsToTest.length}/${allCategoryIds.length} categories`
  );
} else {
  // eslint-disable-next-line no-console
  console.log(`Testing all ${categoryIdsToTest.length} unique category_ids from fixture`);
}

describe('GET /api/products — category view (catId) validated against Excel', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '300000', 10));

  /** @type {import('supertest').SuperTest<Test>} */
  let agent;

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
    expect(categoryProducts.length, 'Category Excel must contain at least one product').to.be.above(
      0
    );
    expect(allCategoryIds.length, 'Category Excel must contain at least one category_id').to.be.above(
      0
    );
  });

  if (!categoryIdsToTest.length) {
    it('skipped — no category_ids selected for test run', function () {
      this.skip();
    });
    return;
  }

  for (const categoryId of categoryIdsToTest) {
    it(`catId=${categoryId} returns all fixture-assigned visible products`, async function () {
      const expectedCodes = expectedProductCodesForCategory(categoryProducts, categoryId);
      const expectedCount = expectedCodes.size;

      if (expectedCount === 0) {
        // eslint-disable-next-line no-console
        console.log(`\ncatId=${categoryId}: skipped — no visible products in fixture`);
        this.skip();
      }

      // eslint-disable-next-line no-console
      console.log(`\ncatId=${categoryId} | expected=${expectedCount}`);

      const result = await runFilterScenario(agent, {
        filterQuery: { catId: String(categoryId) },
        expectedCodes,
        filtersLabel: `catId=${categoryId}`,
        excelByCode,
        assertFn: async (apiProducts) =>
          assertProductsBelongToCategory(apiProducts, categoryId, excelByCode),
      });

      // eslint-disable-next-line no-console
      console.log(`catId=${categoryId} | actual=${result.actualCount}`);
    });
  }

  after(function () {
    // eslint-disable-next-line no-console
    console.log(
      `\nCategory test summary: ${categoryIdsToTest.length} categories tested (${allCategoryIds.length} in fixture)\n`
    );
  });
});
