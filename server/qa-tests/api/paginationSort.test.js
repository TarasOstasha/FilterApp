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
const { buildPaginationSortScenarios } = require('../helpers/paginationSortScenarios');
const {
  SORT_OPTIONS,
  buildProductsQuery,
  assertPaginationAndSort,
} = require('../helpers/paginationSortTestUtils');
const { bootstrapApiProductVisibility } = require('../helpers/apiTestBootstrap');

const filterLoaded = loadExcelProducts(resolveExcelPath());
const filterSummary = buildLoadSummary(filterLoaded);
const { products: filterProducts } = filterLoaded;
const { uniqueAtomicByField } = filterSummary;

const categoryLoaded = loadCategoryProducts();
const categorySummary = buildCategoryLoadSummary(categoryLoaded);
const { products: categoryProducts } = categoryLoaded;

const excludedFields = getExcludedTestFields();
const categoryIds = selectCategoryIdsForCombinedFilterTest(
  categorySummary.uniqueCategoryIds,
  categorySummary.countsByCategory
);

const scenarios = buildPaginationSortScenarios(
  categoryIds,
  filterProducts,
  categoryProducts,
  uniqueAtomicByField,
  excludedFields
);

const pageSize = parseInt(process.env.QA_PAGINATION_PAGE_SIZE || '27', 10);
const maxFullUnion = parseInt(process.env.QA_MAX_PAGINATION_FULL_UNION || '600', 10);

// eslint-disable-next-line no-console
console.log(`\n${formatCategoryLoadSummaryText(categorySummary)}`);
// eslint-disable-next-line no-console
console.log(
  `\n=== Pagination + sort scenarios (${scenarios.length}) | pageSize=${pageSize} | maxUnion=${maxFullUnion} ===`
);
for (const s of scenarios) {
  // eslint-disable-next-line no-console
  console.log(`  - [${s.kind}] ${s.label}`);
}

describe('GET /api/products — pagination and sorting', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '600000', 10));

  /** @type {import('supertest').SuperTest<Test>} */
  let agent;

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
    expect(scenarios.length, 'need at least one pagination scenario').to.be.above(0);
  });

  for (const scenario of scenarios) {
    for (const sortBy of SORT_OPTIONS) {
      it(`${scenario.label} | sortBy=${sortBy}`, async function () {
        const baseQuery = buildProductsQuery(scenario.filterQuery, scenario.categoryId);
        const label = `${scenario.label} | sortBy=${sortBy}`;

        const result = await assertPaginationAndSort(
          agent,
          baseQuery,
          sortBy,
          pageSize,
          maxFullUnion,
          label
        );

        if (result.skipped) {
          // eslint-disable-next-line no-console
          console.log(`  skipped ${label} — zero products`);
          this.skip();
        }

        // eslint-disable-next-line no-console
        console.log(`\n${label} | total=${result.total} | verified union up to ${Math.min(result.total, maxFullUnion)}`);
      });
    }
  }

  after(function () {
    // eslint-disable-next-line no-console
    console.log(
      `\nPagination + sort tests completed: ${scenarios.length} scenarios × ${SORT_OPTIONS.length} sorts\n`
    );
  });
});
