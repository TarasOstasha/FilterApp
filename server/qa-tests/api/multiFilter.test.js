const { expect } = require('chai');
const { getTestAgent } = require('../helpers/testServer');
const {
  loadExcelProducts,
  buildLoadSummary,
  resolveExcelPath,
  getExcludedTestFields,
} = require('../helpers/excelProductLoader');
const {
  buildApiQueryForFilter,
  buildApiQueryMulti,
  expectedProductCodesForMultiFilter,
  expectedProductCodesForCheckboxOr,
  fetchAllProductsForFilter,
  productCodesFromApi,
  compareProductCodeSets,
  runFilterScenario,
} = require('../helpers/filterTestUtils');
const { buildMultiFilterScenarios } = require('../helpers/multiFilterScenarios');
const { bootstrapApiProductVisibility } = require('../helpers/apiTestBootstrap');

const excelPath = resolveExcelPath();
const loaded = loadExcelProducts(excelPath);
const summary = buildLoadSummary(loaded);
const { products: excelProducts } = loaded;
const { uniqueAtomicByField } = summary;
const excelByCode = new Map(excelProducts.map((p) => [p.product_code, p]));

const excludedFields = getExcludedTestFields();
const scenarios = buildMultiFilterScenarios(
  excelProducts,
  uniqueAtomicByField,
  28,
  excludedFields
);

// eslint-disable-next-line no-console
console.log(`\n=== Multi-filter test scenarios (${scenarios.length}) ===`);
for (const s of scenarios) {
  // eslint-disable-next-line no-console
  console.log(`  - [${s.kind}] ${s.label}`);
}

describe('GET /api/products — multi-filter validation', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '300000', 10));

  let agent;

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
    expect(scenarios.length, 'need at least one multi-filter scenario').to.be.above(0);
  });

  for (const scenario of scenarios) {
    it(scenario.label, async function () {
      const filterQuery = buildApiQueryMulti(scenario.specs);

      if (scenario.kind === 'or-excel') {
        const tokens = scenario.specs.Product_Type;
        const expectedCodes = expectedProductCodesForCheckboxOr(
          excelProducts,
          'Product_Type',
          tokens
        );
        const actualUnion = new Set();
        for (const token of tokens) {
          const body = await fetchAllProductsForFilter(
            agent,
            buildApiQueryForFilter('Product_Type', token)
          );
          for (const code of productCodesFromApi(body.products || [])) {
            actualUnion.add(code);
          }
        }
        compareProductCodeSets(expectedCodes, actualUnion, {
          filters: `${scenario.label} (OR via union of single-value API calls)`,
          expectedCount: expectedCodes.size,
          actualCount: actualUnion.size,
        });
        return;
      }

      const expectedCodes = expectedProductCodesForMultiFilter(
        excelProducts,
        scenario.specs
      );

      await runFilterScenario(agent, {
        filterQuery,
        expectedCodes,
        filtersLabel: scenario.label,
        excelByCode,
      });
    });
  }

  after(function () {
    // eslint-disable-next-line no-console
    console.log(`\nMulti-filter tests completed: ${scenarios.length} scenarios`);
  });
});
