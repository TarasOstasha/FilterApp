const { expect } = require('chai');
const { getTestAgent } = require('../helpers/testServer');
const {
  loadExcelProducts,
  buildLoadSummary,
  formatLoadSummaryText,
  resolveExcelPath,
  CHECKBOX_FIELDS,
} = require('../helpers/excelProductLoader');
const {
  API_FIELD_MAP,
  buildApiQueryForFilter,
  fetchAllProductsForFilter,
  productCodesFromApi,
  expectedProductCodesForFilter,
  assertProductsSatisfyFilter,
  compareProductCodeSets,
  formatFilterCaseLog,
  applyUniqueValueCap,
} = require('../helpers/filterTestUtils');

/** Checkbox filters — tests use atomic tokens (comma-split like import). */
const ACTIVE_TEST_FIELDS = ['Product_Type', 'Backlit', 'Booth_Size'];

const excelPath = resolveExcelPath();
const loaded = loadExcelProducts(excelPath);
const summary = buildLoadSummary(loaded);
const { products: excelProducts } = loaded;
const { uniqueAtomicByField } = summary;
const excelByCode = new Map(excelProducts.map((p) => [p.product_code, p]));

// eslint-disable-next-line no-console
console.log(`\n${formatLoadSummaryText(summary)}\n`);

// eslint-disable-next-line no-console
console.log('=== Atomic tokens used for API tests (comma-split, matches import) ===');
for (const field of ACTIVE_TEST_FIELDS) {
  const values = uniqueAtomicByField[field] || [];
  // eslint-disable-next-line no-console
  console.log(`\n${field} (${values.length} unique tokens):`);
  // eslint-disable-next-line no-console
  console.log(values.length ? values.join(' | ') : '(none)');
}

describe('GET /api/products — checkbox filters validated against Excel', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '120000', 10));

  /** @type {import('supertest').SuperTest<Test>} */
  let agent;

  before(function () {
    agent = getTestAgent();
    expect(excelProducts.length, 'Excel must contain at least one product').to.be.above(0);

    for (const field of ACTIVE_TEST_FIELDS) {
      expect(uniqueAtomicByField[field], `uniqueAtomicByField.${field}`).to.be.an('array');
    }
  });

  for (const field of ACTIVE_TEST_FIELDS) {
    const allValues = uniqueAtomicByField[field] || [];
    const valuesToTest = applyUniqueValueCap(allValues);

    if (valuesToTest.length === 0) {
      describe(`filter: ${field} (API param: ${API_FIELD_MAP[field].apiParam})`, function () {
        it('skipped — no atomic tokens in Excel', function () {
          this.skip();
        });
      });
      continue;
    }

    describe(`filter: ${field} (API param: ${API_FIELD_MAP[field].apiParam})`, function () {
      for (const filterValue of valuesToTest) {
        it(`returns exactly the Excel-expected products for ${field}=${filterValue}`, async function () {
          const filterQuery = buildApiQueryForFilter(field, filterValue);
          const body = await fetchAllProductsForFilter(agent, filterQuery);
          const apiProducts = body.products || [];
          const actualCodes = productCodesFromApi(apiProducts);
          const expectedCodes = expectedProductCodesForFilter(
            excelProducts,
            field,
            filterValue
          );

          const expectedCount = expectedCodes.size;
          const actualCount = Number(body.totalProducts) || actualCodes.size;

          // eslint-disable-next-line no-console
          console.log(formatFilterCaseLog(field, filterValue, expectedCount, actualCount));

          compareProductCodeSets(expectedCodes, actualCodes, {
            field,
            value: filterValue,
            expectedCount,
            actualCount,
            excelCatalog: excelByCode,
          });

          assertProductsSatisfyFilter(apiProducts, field, filterValue, excelByCode);
        });
      }
    });
  }

  after(function () {
    const testSummary = ACTIVE_TEST_FIELDS.map((f) => ({
      field: f,
      uniqueAtomicTokens: uniqueAtomicByField[f]?.length || 0,
      testsExecuted: applyUniqueValueCap(uniqueAtomicByField[f] || []).length,
    }));
    // eslint-disable-next-line no-console
    console.log('\nActive filter test summary:', JSON.stringify(testSummary, null, 2));
  });
});
