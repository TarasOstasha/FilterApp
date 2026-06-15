const { expect } = require('chai');
const { getTestAgent } = require('../helpers/testServer');
const {
  loadExcelProducts,
  buildLoadSummary,
  resolveExcelPath,
} = require('../helpers/excelProductLoader');
const { runFilterScenario } = require('../helpers/filterTestUtils');
const { bootstrapApiProductVisibility } = require('../helpers/apiTestBootstrap');
const { fetchVisibleCatalogPrices } = require('../helpers/catalogPrices');
const {
  PRICE_BUCKET_TEMPLATES,
  expectedProductCodesForMultiFilterAndCatalogPrice,
  assertApiProductsSatisfyCatalogPriceRange,
  buildApiQueryMultiWithCatalogPrice,
} = require('../helpers/priceTestUtils');
const { buildMultiFilterPriceScenarios } = require('../helpers/multiFilterPriceScenarios');

const excelPath = resolveExcelPath();
const loaded = loadExcelProducts(excelPath);
const summary = buildLoadSummary(loaded);
const { products: excelProducts } = loaded;
const { uniqueAtomicByField } = summary;
const excelByCode = new Map(excelProducts.map((p) => [p.product_code, p]));

const scenarioTemplates = buildMultiFilterPriceScenarios(
  uniqueAtomicByField,
  PRICE_BUCKET_TEMPLATES,
  24
);

// eslint-disable-next-line no-console
console.log(`\n=== Multi-filter + price scenario templates (${scenarioTemplates.length}) ===`);
for (const s of scenarioTemplates) {
  // eslint-disable-next-line no-console
  console.log(`  - ${s.label}`);
}

describe('GET /api/products — multi-filter + Product Price', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '300000', 10));

  /** @type {import('supertest').SuperTest<Test>} */
  let agent;
  /** @type {Array<{ product_code: string, product_price: number }>} */
  let catalog;

  before(async function () {
    await bootstrapApiProductVisibility();
    catalog = await fetchVisibleCatalogPrices();
    agent = getTestAgent();

    expect(catalog.length, 'visible catalog must have priced products').to.be.above(0);
    expect(scenarioTemplates.length, 'need at least one scenario template').to.be.above(0);
  });

  for (const scenario of scenarioTemplates) {
    it(scenario.label, async function () {
      const { specs, price } = scenario;
      const expectedCodes = expectedProductCodesForMultiFilterAndCatalogPrice(
        excelProducts,
        specs,
        catalog,
        price.min,
        price.max
      );

      if (!expectedCodes.size) {
        // eslint-disable-next-line no-console
        console.log(`  skipped ${scenario.label} — no products match filters + price`);
        this.skip();
      }

      await runFilterScenario(agent, {
        filterQuery: buildApiQueryMultiWithCatalogPrice(specs, price.min, price.max),
        expectedCodes,
        filtersLabel: scenario.label,
        excelByCode,
        assertFn: async (apiProducts) =>
          assertApiProductsSatisfyCatalogPriceRange(apiProducts, price.min, price.max),
      });
    });
  }

  after(function () {
    // eslint-disable-next-line no-console
    console.log(`\nMulti-filter + price tests completed: ${scenarioTemplates.length} scenarios`);
  });
});
