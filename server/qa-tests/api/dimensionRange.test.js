const { expect } = require('chai');
const { getTestAgent } = require('../helpers/testServer');
const {
  loadExcelProducts,
  buildLoadSummary,
  formatLoadSummaryText,
  resolveExcelPath,
} = require('../helpers/excelProductLoader');
const { bootstrapApiProductVisibility } = require('../helpers/apiTestBootstrap');
const {
  DIMENSION_FIELDS,
  buildDimensionRangeScenarios,
  selectRepresentativeDimensionValues,
  buildDimensionSpanBuckets,
} = require('../helpers/dimensionRangeTestUtils');
const {
  API_FIELD_MAP,
  buildApiQueryForRange,
  expectedProductCodesForDimensionRange,
  runFilterScenario,
} = require('../helpers/filterTestUtils');

const excelPath = resolveExcelPath();
const loaded = loadExcelProducts(excelPath);
const summary = buildLoadSummary(loaded);
const { products: excelProducts } = loaded;
const excelByCode = new Map(excelProducts.map((p) => [p.product_code, p]));

const scenarios = buildDimensionRangeScenarios(excelProducts, 5, 5);

// eslint-disable-next-line no-console
console.log(`\n${formatLoadSummaryText(summary)}\n`);

// eslint-disable-next-line no-console
console.log('=== Display Width / Height range tests ===');
for (const field of DIMENSION_FIELDS) {
  const apiParam = API_FIELD_MAP[field].apiParam;
  const points = selectRepresentativeDimensionValues(excelProducts, field, 5);
  const spans = buildDimensionSpanBuckets(excelProducts, field);
  // eslint-disable-next-line no-console
  console.log(
    `${field} (${apiParam}) | point samples: ${points.join(', ') || '(none)'} | span buckets: ${spans.map((b) => b.label).join(', ') || '(none)'}`
  );
}

// eslint-disable-next-line no-console
console.log(`\n=== Dimension range scenarios (${scenarios.length}) ===`);
for (const s of scenarios) {
  // eslint-disable-next-line no-console
  console.log(`  - [${s.kind}] ${s.label}`);
}

describe('GET /api/products — Display Width / Height (range filters)', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '180000', 10));

  /** @type {import('supertest').SuperTest<Test>} */
  let agent;

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
    expect(excelProducts.length, 'Excel must contain at least one product').to.be.above(0);
    if (!scenarios.length) this.skip();
  });

  for (const scenario of scenarios) {
    it(scenario.label, async function () {
      const { field, min, max } = scenario;
      const expectedCodes = expectedProductCodesForDimensionRange(
        excelProducts,
        field,
        min,
        max
      );

      if (!expectedCodes.size) {
        // eslint-disable-next-line no-console
        console.log(`  skipped ${scenario.label} — no Excel products in range`);
        this.skip();
      }

      await runFilterScenario(agent, {
        filterQuery: buildApiQueryForRange(field, min, max),
        expectedCodes,
        filtersLabel: `${API_FIELD_MAP[field].apiParam}=${min},${max}`,
        excelByCode,
      });
    });
  }

  after(function () {
    // eslint-disable-next-line no-console
    console.log(`\nDimension range tests completed: ${scenarios.length} scenarios`);
  });
});
