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
  expectedProductCodesForCategory,
  expectedProductCodesForCategoryAndMultiFilter,
} = require('../helpers/categoryTestUtils');
const { buildCategoryFilterScenarios } = require('../helpers/categoryFilterScenarios');
const { buildRangeEndpointScenarios } = require('../helpers/rangeEndpointScenarios');
const {
  expectedPriceRangeLikeApi,
  expectedWidthRangeLikeApi,
  expectedHeightRangeLikeApi,
} = require('../helpers/dbRangeEndpoints');
const {
  fetchPriceRange,
  fetchWidthRange,
  fetchHeightRange,
  assertPriceRangeBody,
  assertDimensionRangeBody,
} = require('../helpers/rangeEndpointTestUtils');
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

const filterScenarios = buildCategoryFilterScenarios(
  filterProducts,
  categoryProducts,
  uniqueAtomicByField,
  categoryIds,
  { excludedFields }
);

const scenarios = buildRangeEndpointScenarios(categoryIds, filterScenarios);

// eslint-disable-next-line no-console
console.log(`\n${formatCategoryLoadSummaryText(categorySummary)}`);
// eslint-disable-next-line no-console
console.log(`\n=== Range endpoint scenarios (${scenarios.length}) ===`);
for (const s of scenarios) {
  // eslint-disable-next-line no-console
  console.log(`  - [${s.kind}] ${s.label}`);
}

function shouldSkipScenario(scenario) {
  if (scenario.kind === 'global') return false;

  if (scenario.kind === 'category') {
    return expectedProductCodesForCategory(categoryProducts, scenario.categoryId).size === 0;
  }

  if (scenario.kind === 'filter' && scenario.filterSpecs) {
    return (
      expectedProductCodesForCategoryAndMultiFilter(
        filterProducts,
        categoryProducts,
        scenario.categoryId,
        scenario.filterSpecs
      ).size === 0
    );
  }

  return false;
}

async function runRangeScenario(agent, scenario, fetchFn, expectedFn, assertFn, endpointName) {
  if (shouldSkipScenario(scenario)) {
    // eslint-disable-next-line no-console
    console.log(`  skipped ${scenario.label}`);
    return 'skip';
  }

  const expected = await expectedFn(scenario.categoryId, scenario.filterQuery);
  const actual = await fetchFn(agent, scenario.categoryId, scenario.filterQuery);

  // eslint-disable-next-line no-console
  console.log(`\n${endpointName} ${scenario.label} | ${JSON.stringify(actual)}`);

  assertFn(actual, expected, scenario.label);
  return 'ok';
}

describe('GET /api/products/price-range', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '600000', 10));

  let agent;

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
    expect(scenarios.length).to.be.above(0);
  });

  for (const scenario of scenarios) {
    it(scenario.label, async function () {
      const result = await runRangeScenario(
        agent,
        scenario,
        fetchPriceRange,
        expectedPriceRangeLikeApi,
        assertPriceRangeBody,
        'price-range'
      );
      if (result === 'skip') this.skip();
    });
  }
});

describe('GET /api/products/width-range', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '600000', 10));

  let agent;

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
  });

  for (const scenario of scenarios) {
    it(scenario.label, async function () {
      const result = await runRangeScenario(
        agent,
        scenario,
        fetchWidthRange,
        expectedWidthRangeLikeApi,
        assertDimensionRangeBody,
        'width-range'
      );
      if (result === 'skip') this.skip();
    });
  }
});

describe('GET /api/products/height-range', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '600000', 10));

  let agent;

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
  });

  for (const scenario of scenarios) {
    it(scenario.label, async function () {
      const result = await runRangeScenario(
        agent,
        scenario,
        fetchHeightRange,
        expectedHeightRangeLikeApi,
        assertDimensionRangeBody,
        'height-range'
      );
      if (result === 'skip') this.skip();
    });
  }

  after(function () {
    // eslint-disable-next-line no-console
    console.log(`\nRange endpoint tests completed: ${scenarios.length} scenarios × 3 endpoints\n`);
  });
});
