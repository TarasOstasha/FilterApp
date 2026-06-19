const { expect } = require('chai');
const { getTestAgent } = require('../helpers/testServer');
const {
  loadExcelProducts,
  resolveExcelPath,
} = require('../helpers/excelProductLoader');
const {
  loadCategoryProducts,
  buildCategoryLoadSummary,
  formatCategoryLoadSummaryText,
  selectCategoryIdsForCombinedFilterTest,
} = require('../helpers/excelCategoryLoader');
const { buildMegaFilterCodeScenarios } = require('../helpers/megaFilterScenarios');
const {
  SORT_OPTIONS,
  expectedMegaProductsFromDb,
  discoverMultiWordMegaScenarios,
} = require('../helpers/dbMegaFilter');
const { fetchMegaProducts, assertMegaProductsMatch } = require('../helpers/megaFilterTestUtils');
const { bootstrapApiProductVisibility } = require('../helpers/apiTestBootstrap');

const filterLoaded = loadExcelProducts(resolveExcelPath());
const { products: filterProducts } = filterLoaded;

const categoryLoaded = loadCategoryProducts();
const categorySummary = buildCategoryLoadSummary(categoryLoaded);
const { products: categoryProducts } = categoryLoaded;

const categoryIds = selectCategoryIdsForCombinedFilterTest(
  categorySummary.uniqueCategoryIds,
  categorySummary.countsByCategory
);

const codeScenarios = buildMegaFilterCodeScenarios(
  filterProducts,
  categoryProducts,
  categoryIds
);

// eslint-disable-next-line no-console
console.log(`\n${formatCategoryLoadSummaryText(categorySummary)}`);
// eslint-disable-next-line no-console
console.log(`\n=== Mega filter code scenarios (${codeScenarios.length}) ===`);
for (const s of codeScenarios) {
  // eslint-disable-next-line no-console
  console.log(`  - [${s.kind}] ${s.label}`);
}

async function runMegaScenario(agent, scenario, sortBy) {
  const expected = await expectedMegaProductsFromDb(
    scenario.searchTerms,
    sortBy,
    scenario.categoryId
  );

  if (!expected.length) {
    return { skipped: true, label: `${scenario.label} | sortBy=${sortBy}` };
  }

  const actual = await fetchMegaProducts(
    agent,
    scenario.searchTerms,
    sortBy,
    scenario.categoryId
  );

  const label = `${scenario.label} | sortBy=${sortBy}`;
  // eslint-disable-next-line no-console
  console.log(`\nmega ${label} | expected=${expected.length} | actual=${actual.length}`);

  assertMegaProductsMatch(actual, expected, label);
  return { skipped: false, label };
}

describe('GET /api/products/mega — product code / prefix search', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '600000', 10));

  let agent;

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
    expect(codeScenarios.length, 'need at least one mega code scenario').to.be.above(0);
  });

  for (const scenario of codeScenarios) {
    for (const sortBy of SORT_OPTIONS) {
      it(`${scenario.label} | sortBy=${sortBy}`, async function () {
        const result = await runMegaScenario(agent, scenario, sortBy);
        if (result.skipped) {
          // eslint-disable-next-line no-console
          console.log(`  skipped ${result.label} — no DB matches`);
          this.skip();
        }
      });
    }
  }
});

describe('GET /api/products/mega — multi-word search (AND)', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '600000', 10));

  let agent;
  /** @type {Array<{ kind: string, label: string, categoryId: string|null, searchTerms: string }>} */
  let multiWordScenarios = [];

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
    multiWordScenarios = await discoverMultiWordMegaScenarios(
      categoryIds,
      parseInt(process.env.QA_MAX_MEGA_MULTI_WORD || '3', 10)
    );
    // eslint-disable-next-line no-console
    console.log(`\n=== Mega filter multi-word scenarios (${multiWordScenarios.length}) ===`);
    for (const s of multiWordScenarios) {
      // eslint-disable-next-line no-console
      console.log(`  - [${s.kind}] ${s.label}`);
    }
  });

  it('has at least one multi-word scenario', function () {
    if (!multiWordScenarios.length) {
      // eslint-disable-next-line no-console
      console.log('  skipped — no multi-word scenarios discovered from catalog');
      this.skip();
    }
  });

  for (const sortBy of SORT_OPTIONS) {
    it(`all multi-word scenarios | sortBy=${sortBy}`, async function () {
      if (!multiWordScenarios.length) this.skip();

      for (const scenario of multiWordScenarios) {
        const result = await runMegaScenario(agent, scenario, sortBy);
        if (result.skipped) {
          throw new Error(`${result.label} — expected matches from discovery but none at test time`);
        }
      }
    });
  }

  after(function () {
    // eslint-disable-next-line no-console
    console.log(
      `\nMega filter tests completed: ${codeScenarios.length} code scenarios × ${SORT_OPTIONS.length} sorts + multi-word\n`
    );
  });
});
