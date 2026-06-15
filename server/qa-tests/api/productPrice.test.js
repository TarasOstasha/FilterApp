const { expect } = require('chai');
const { getTestAgent } = require('../helpers/testServer');
const { bootstrapApiProductVisibility } = require('../helpers/apiTestBootstrap');
const { fetchVisibleCatalogPrices } = require('../helpers/catalogPrices');
const {
  buildPriceRangeBucketsFromCatalog,
  selectRepresentativeCatalogPrices,
  expectedProductCodesForCatalogPriceRange,
  assertApiProductsSatisfyCatalogPriceRange,
  PRICE_BUCKET_TEMPLATES,
} = require('../helpers/priceTestUtils');
const {
  buildApiQueryForPriceRange,
  runFilterScenario,
} = require('../helpers/filterTestUtils');

describe('GET /api/products — Product Price (products.product_price BETWEEN)', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '180000', 10));

  /** @type {import('supertest').SuperTest<Test>} */
  let agent;
  /** @type {Array<{ product_code: string, product_price: number }>} */
  let catalog;
  /** @type {Map<string, { product_code: string, product_price: number }>} */
  let catalogByCode;
  /** @type {number[]} */
  let pointPriceSamples;

  before(async function () {
    await bootstrapApiProductVisibility();
    catalog = await fetchVisibleCatalogPrices();
    catalogByCode = new Map(catalog.map((row) => [row.product_code, row]));
    pointPriceSamples = selectRepresentativeCatalogPrices(catalog, 5);
    agent = getTestAgent();

    expect(catalog.length, 'visible catalog must have priced products').to.be.above(0);

    const prices = catalog.map((r) => r.product_price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // eslint-disable-next-line no-console
    console.log('\n=== Product price API test (DB catalog) ===');
    // eslint-disable-next-line no-console
    console.log(`Visible priced products: ${catalog.length}`);
    // eslint-disable-next-line no-console
    console.log(`Price range: ${minPrice} – ${maxPrice}`);
    // eslint-disable-next-line no-console
    console.log(
      `Buckets to run: ${buildPriceRangeBucketsFromCatalog(catalog).map((b) => b.label).join(', ')}`
    );
    // eslint-disable-next-line no-console
    console.log(`Point samples: ${pointPriceSamples.join(', ')}\n`);
  });

  for (const bucket of PRICE_BUCKET_TEMPLATES) {
    it(`price range ${bucket.label} (${bucket.min}-${bucket.max === Number.MAX_SAFE_INTEGER ? '∞' : bucket.max})`, async function () {
      const expectedCodes = expectedProductCodesForCatalogPriceRange(
        catalog,
        bucket.min,
        bucket.max
      );

      if (!expectedCodes.size) {
        // eslint-disable-next-line no-console
        console.log(`  skipped ${bucket.label} — no catalog products in range`);
        this.skip();
      }

      await runFilterScenario(agent, {
        filterQuery: buildApiQueryForPriceRange(bucket.min, bucket.max),
        expectedCodes,
        filtersLabel: `Product Price=${bucket.label}`,
        excelByCode: catalogByCode,
        assertFn: async (apiProducts) =>
          assertApiProductsSatisfyCatalogPriceRange(apiProducts, bucket.min, bucket.max),
      });
    });
  }

  it('representative point price ranges (min=max)', async function () {
    if (!pointPriceSamples.length) this.skip();

    for (const price of pointPriceSamples) {
      const expectedCodes = expectedProductCodesForCatalogPriceRange(
        catalog,
        price,
        price
      );

      // eslint-disable-next-line no-console
      console.log(`\npoint price ${price} | expected=${expectedCodes.size}`);

      if (!expectedCodes.size) continue;

      await runFilterScenario(agent, {
        filterQuery: buildApiQueryForPriceRange(price, price),
        expectedCodes,
        filtersLabel: `Product Price=${price},${price}`,
        excelByCode: catalogByCode,
        assertFn: async (apiProducts) =>
          assertApiProductsSatisfyCatalogPriceRange(apiProducts, price, price),
      });
    }
  });
});
