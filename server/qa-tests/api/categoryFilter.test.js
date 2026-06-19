const { expect } = require('chai');
const { getTestAgent } = require('../helpers/testServer');
const {
  loadExcelProducts,
  buildLoadSummary,
  resolveExcelPath,
  getExcludedTestFields,
} = require('../helpers/excelProductLoader');
const {
  loadCategoryProducts,
  buildCategoryLoadSummary,
  formatCategoryLoadSummaryText,
  selectCategoryIdsForCombinedFilterTest,
} = require('../helpers/excelCategoryLoader');
const {
  expectedProductCodesForCategoryAndFilter,
  expectedProductCodesForCategoryAndMultiFilter,
  assertProductsBelongToCategory,
  buildApiQueryWithCategory,
} = require('../helpers/categoryTestUtils');
const { buildApiQueryMulti, buildApiQueryForFilter, runFilterScenario } = require('../helpers/filterTestUtils');
const { buildCategoryFilterScenarios } = require('../helpers/categoryFilterScenarios');
const { bootstrapApiProductVisibility } = require('../helpers/apiTestBootstrap');

const filterExcelPath = resolveExcelPath();
const filterLoaded = loadExcelProducts(filterExcelPath);
const filterSummary = buildLoadSummary(filterLoaded);
const { products: filterProducts } = filterLoaded;
const { uniqueAtomicByField } = filterSummary;
const filterByCode = new Map(filterProducts.map((p) => [p.product_code, p]));

const categoryLoaded = loadCategoryProducts();
const categorySummary = buildCategoryLoadSummary(categoryLoaded);
const { products: categoryProducts } = categoryLoaded;
const categoryByCode = new Map(categoryProducts.map((p) => [p.product_code, p]));

const excludedFields = getExcludedTestFields();
const categoryIds = selectCategoryIdsForCombinedFilterTest(
  categorySummary.uniqueCategoryIds,
  categorySummary.countsByCategory
);

const scenarios = buildCategoryFilterScenarios(
  filterProducts,
  categoryProducts,
  uniqueAtomicByField,
  categoryIds,
  { excludedFields }
);

// eslint-disable-next-line no-console
console.log(`\n${formatCategoryLoadSummaryText(categorySummary)}`);
// eslint-disable-next-line no-console
console.log(`\nFilter fixture: ${filterExcelPath} (${filterProducts.length} products)`);
// eslint-disable-next-line no-console
console.log(
  `\n=== Category + filter scenarios (${scenarios.length}) | categories: ${categoryIds.join(', ')} ===`
);
for (const s of scenarios) {
  // eslint-disable-next-line no-console
  console.log(`  - [${s.kind}] ${s.label}`);
}

describe('GET /api/products — category + filters validated against Excel', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '600000', 10));

  /** @type {import('supertest').SuperTest<Test>} */
  let agent;

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
    expect(filterProducts.length, 'filter Excel must contain products').to.be.above(0);
    expect(categoryProducts.length, 'category Excel must contain products').to.be.above(0);
    expect(categoryIds.length, 'need at least one category to test').to.be.above(0);
    expect(scenarios.length, 'need at least one category+filter scenario').to.be.above(0);
  });

  for (const scenario of scenarios) {
    it(scenario.label, async function () {
      const { categoryId, specs, kind } = scenario;

      const expectedCodes =
        kind === 'single'
          ? expectedProductCodesForCategoryAndFilter(
              filterProducts,
              categoryProducts,
              categoryId,
              Object.keys(specs)[0],
              specs[Object.keys(specs)[0]]
            )
          : expectedProductCodesForCategoryAndMultiFilter(
              filterProducts,
              categoryProducts,
              categoryId,
              specs
            );

      if (!expectedCodes.size) {
        // eslint-disable-next-line no-console
        console.log(`  skipped ${scenario.label} — no products in category match filters`);
        this.skip();
      }

      const filterQuery =
        kind === 'single'
          ? buildApiQueryWithCategory(
              categoryId,
              buildApiQueryForFilter(Object.keys(specs)[0], specs[Object.keys(specs)[0]])
            )
          : buildApiQueryWithCategory(categoryId, buildApiQueryMulti(specs));

      await runFilterScenario(agent, {
        filterQuery,
        expectedCodes,
        filtersLabel: scenario.label,
        excelByCode: filterByCode,
        assertFn: async (apiProducts) =>
          assertProductsBelongToCategory(apiProducts, categoryId, categoryByCode),
      });
    });
  }

  after(function () {
    // eslint-disable-next-line no-console
    console.log(
      `\nCategory + filter tests completed: ${scenarios.length} scenarios across ${categoryIds.length} categories\n`
    );
  });
});
