const { expect } = require('chai');
const { getTestAgent } = require('../helpers/testServer');
const {
  loadExcelProducts,
  buildLoadSummary,
  formatLoadSummaryText,
  resolveExcelPath,
  getExcludedTestFields,
  CHECKBOX_FIELDS,
} = require('../helpers/excelProductLoader');
const {
  API_FIELD_MAP,
  buildApiQueryForFilter,
  buildApiQueryForRange,
  buildApiQueryForPriceRange,
  expectedProductCodesForFilter,
  expectedProductCodesForDimensionRange,
  expectedProductCodesForPriceRange,
  assertProductsSatisfyFilter,
  applyUniqueValueCap,
  runFilterScenario,
} = require('../helpers/filterTestUtils');
const {
  uniqueReasonableDimensionValues,
  selectRepresentativeNumericValues,
  buildPriceRangeBuckets,
  excelProductPriceIsTierColumn,
} = require('../helpers/sampleValueSelector');
const { bootstrapApiProductVisibility } = require('../helpers/apiTestBootstrap');

const CHECKBOX_TEST_FIELDS = CHECKBOX_FIELDS;
const excludedFields = getExcludedTestFields();
const RANGE_TEST_FIELDS = ['Display_Width', 'Display_Height'].filter(
  (field) => !excludedFields.has(field)
);

const excelPath = resolveExcelPath();
const loaded = loadExcelProducts(excelPath);
const summary = buildLoadSummary(loaded);
const { products: excelProducts } = loaded;
const { uniqueAtomicByField } = summary;
const excelByCode = new Map(excelProducts.map((p) => [p.product_code, p]));

// eslint-disable-next-line no-console
console.log(`\n${formatLoadSummaryText(summary)}\n`);

// eslint-disable-next-line no-console
console.log('=== Checkbox fields — atomic tokens (comma-split, matches import) ===');
for (const field of CHECKBOX_TEST_FIELDS) {
  const allValues = uniqueAtomicByField[field] || [];
  const tested = applyUniqueValueCap(allValues);
  const apiParam = API_FIELD_MAP[field]?.apiParam || '(unmapped)';
  // eslint-disable-next-line no-console
  console.log(
    `\n${field} → API "${apiParam}" | unique=${allValues.length} | under test=${tested.length}`
  );
  if (!allValues.length) {
    // eslint-disable-next-line no-console
    console.log('  (skipped — no atomic tokens in Excel)');
  } else {
    // eslint-disable-next-line no-console
    console.log(`  tokens: ${tested.join(' | ')}`);
  }
}

const widthSamples = excludedFields.has('Display_Width')
  ? []
  : selectRepresentativeNumericValues(
      uniqueReasonableDimensionValues(excelProducts, 'Display_Width')
    );
const heightSamples = excludedFields.has('Display_Height')
  ? []
  : selectRepresentativeNumericValues(
      uniqueReasonableDimensionValues(excelProducts, 'Display_Height')
    );
const priceBuckets = excludedFields.has('Product_Price')
  ? []
  : buildPriceRangeBuckets(excelProducts);
const skipPriceTests =
  excludedFields.has('Product_Price') || excelProductPriceIsTierColumn(loaded);

if (excludedFields.size) {
  // eslint-disable-next-line no-console
  console.log(`\nExcluded from API tests (QA_EXCLUDE_TEST_FIELDS): ${[...excludedFields].join(', ')}`);
}

// eslint-disable-next-line no-console
console.log('\n=== Range / price samples for tests ===');
// eslint-disable-next-line no-console
console.log(`Display_Width (${widthSamples.length}): ${widthSamples.join(', ')}`);
// eslint-disable-next-line no-console
console.log(`Display_Height (${heightSamples.length}): ${heightSamples.join(', ')}`);
// eslint-disable-next-line no-console
if (excludedFields.has('Product_Price')) {
  // eslint-disable-next-line no-console
  console.log('Product_Price: skipped — excluded via QA_EXCLUDE_TEST_FIELDS');
} else if (skipPriceTests) {
  // eslint-disable-next-line no-console
  console.log(
    'Product_Price: skipped — Excel column holds price tiers (500, 1000, …), not products.product_price'
  );
} else {
  // eslint-disable-next-line no-console
  console.log(
    `Product_Price buckets (${priceBuckets.length}): ${priceBuckets.map((b) => b.label).join(', ')}`
  );
}

describe('GET /api/products — checkbox filters validated against Excel', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '120000', 10));

  /** @type {import('supertest').SuperTest<Test>} */
  let agent;

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
    expect(excelProducts.length, 'Excel must contain at least one product').to.be.above(0);

    for (const field of CHECKBOX_TEST_FIELDS) {
      expect(uniqueAtomicByField[field], `uniqueAtomicByField.${field}`).to.be.an('array');
    }
  });

  for (const field of CHECKBOX_TEST_FIELDS) {
    const spec = API_FIELD_MAP[field];
    const allValues = uniqueAtomicByField[field] || [];
    const valuesToTest = applyUniqueValueCap(allValues);
    const capRaw = process.env.QA_MAX_UNIQUE_VALUES_PER_FILTER;
    const capNote =
      capRaw && valuesToTest.length < allValues.length
        ? ` (capped by QA_MAX_UNIQUE_VALUES_PER_FILTER=${capRaw})`
        : '';

    if (!spec) {
      describe(`filter: ${field}`, function () {
        it('skipped — no API_FIELD_MAP entry', function () {
          // eslint-disable-next-line no-console
          console.log(`\n${field}: skipped — missing API field mapping`);
          this.skip();
        });
      });
      continue;
    }

    if (valuesToTest.length === 0) {
      describe(`filter: ${field} (API param: ${spec.apiParam})`, function () {
        it('skipped — no atomic tokens in Excel', function () {
          // eslint-disable-next-line no-console
          console.log(
            `\n${field} (API: ${spec.apiParam}): skipped — column empty or no comma-split tokens`
          );
          this.skip();
        });
      });
      continue;
    }

    describe(`filter: ${field} (API param: ${spec.apiParam})`, function () {
      before(function () {
        // eslint-disable-next-line no-console
        console.log(
          `\n--- ${field} | API: ${spec.apiParam} | unique tokens: ${allValues.length} | testing: ${valuesToTest.length}${capNote} ---`
        );
      });

      for (const filterValue of valuesToTest) {
        it(`returns exactly the Excel-expected products for ${field}=${filterValue}`, async function () {
          const filterQuery = buildApiQueryForFilter(field, filterValue);
          const expectedCodes = expectedProductCodesForFilter(
            excelProducts,
            field,
            filterValue
          );
          // eslint-disable-next-line no-console
          console.log(
            `\nfield=${field} | token=${filterValue} | expected=${expectedCodes.size}`
          );
          const result = await runFilterScenario(agent, {
            filterQuery,
            expectedCodes,
            filtersLabel: `${spec.apiParam}=${filterValue}`,
            excelByCode,
            assertFn: async (apiProducts) =>
              assertProductsSatisfyFilter(apiProducts, field, filterValue, excelByCode),
          });
          // eslint-disable-next-line no-console
          console.log(
            `field=${field} | tested=${valuesToTest.length}/${allValues.length} unique tokens | actual=${result.actualCount}`
          );
        });
      }
    });
  }

  after(function () {
    const testSummary = CHECKBOX_TEST_FIELDS.map((f) => ({
      field: f,
      uniqueAtomicTokens: uniqueAtomicByField[f]?.length || 0,
      testsExecuted: applyUniqueValueCap(uniqueAtomicByField[f] || []).length,
    }));
    // eslint-disable-next-line no-console
    console.log('\nCheckbox filter test summary:', JSON.stringify(testSummary, null, 2));
  });
});

describe('GET /api/products — Display Width / Height (range filters)', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '180000', 10));

  let agent;

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
    if (!widthSamples.length && !heightSamples.length) this.skip();
  });

  for (const field of RANGE_TEST_FIELDS) {
    const samples =
      field === 'Display_Width' ? widthSamples : heightSamples;

    if (!samples.length) continue;

    describe(`${field} (API: ${API_FIELD_MAP[field].apiParam}, range min,max)`, function () {
      for (const value of samples) {
        it(`point range ${value},${value} matches Excel`, async function () {
          const filterQuery = buildApiQueryForRange(field, value, value);
          const expectedCodes = expectedProductCodesForDimensionRange(
            excelProducts,
            field,
            value,
            value
          );
          await runFilterScenario(agent, {
            filterQuery,
            expectedCodes,
            filtersLabel: `${API_FIELD_MAP[field].apiParam}=${value},${value}`,
            excelByCode,
          });
        });
      }
    });
  }
});

describe('GET /api/products — Product Price (product_price BETWEEN)', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '180000', 10));

  let agent;

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
    if (skipPriceTests) {
      // eslint-disable-next-line no-console
      console.log(
        'Skipping Product_Price API tests: fixture values are filter tiers; API uses products.product_price.'
      );
      this.skip();
    }
    if (!priceBuckets.length) this.skip();
  });

  for (const bucket of priceBuckets) {
    it(`price range ${bucket.label} (${bucket.min}-${bucket.max === Number.MAX_SAFE_INTEGER ? '∞' : bucket.max})`, async function () {
      const filterQuery = buildApiQueryForPriceRange(bucket.min, bucket.max);
      const expectedCodes = expectedProductCodesForPriceRange(
        excelProducts,
        bucket.min,
        bucket.max
      );
      await runFilterScenario(agent, {
        filterQuery,
        expectedCodes,
        filtersLabel: `Product Price=${bucket.label}`,
        excelByCode,
      });
    });
  }
});
