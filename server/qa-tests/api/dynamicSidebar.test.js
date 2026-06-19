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
const { buildApiQueryMulti, buildApiQueryForFilter } = require('../helpers/filterTestUtils');
const { buildCategoryFilterScenarios } = require('../helpers/categoryFilterScenarios');
const {
  assertCheckboxFacetsMatch,
  fetchStaticSidebar,
  fetchDynamicSidebar,
} = require('../helpers/dynamicSidebarTestUtils');
const { expectedCheckboxFacetsLikeApi } = require('../helpers/dbSidebarFacets');
const { bootstrapApiProductVisibility } = require('../helpers/apiTestBootstrap');

const filterExcelPath = resolveExcelPath();
const filterLoaded = loadExcelProducts(filterExcelPath);
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

// eslint-disable-next-line no-console
console.log(`\n${formatCategoryLoadSummaryText(categorySummary)}`);
// eslint-disable-next-line no-console
console.log(`\nFilter fixture: ${filterExcelPath} (${filterProducts.length} products)`);
// eslint-disable-next-line no-console
console.log(
  `\n=== Dynamic sidebar | static: ${categoryIds.length} categories | dynamic: ${filterScenarios.length} scenarios ===`
);
// eslint-disable-next-line no-console
console.log(`Categories: ${categoryIds.join(', ')}`);

function specsToFilterQuery(specs, kind) {
  if (kind === 'single') {
    const field = Object.keys(specs)[0];
    return buildApiQueryForFilter(field, specs[field]);
  }
  return buildApiQueryMulti(specs);
}

describe('GET /api/filterField — static sidebar facets (catId)', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '600000', 10));

  let agent;

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
    expect(categoryIds.length).to.be.above(0);
  });

  for (const categoryId of categoryIds) {
    it(`catId=${categoryId} checkbox allowed_values match API SQL scope`, async function () {
      const codes = expectedProductCodesForCategory(categoryProducts, categoryId);
      if (!codes.size) {
        // eslint-disable-next-line no-console
        console.log(`  skipped catId=${categoryId} — no visible products in category fixture`);
        this.skip();
      }

      const expected = await expectedCheckboxFacetsLikeApi(categoryId, {}, excludedFields);
      const apiFields = await fetchStaticSidebar(agent, categoryId);

      // eslint-disable-next-line no-console
      console.log(
        `\nstatic catId=${categoryId} | fixture products=${codes.size} | api fields=${apiFields.length}`
      );

      assertCheckboxFacetsMatch(
        apiFields,
        expected,
        'static',
        `static catId=${categoryId}`,
        excludedFields
      );
    });
  }
});

describe('GET /api/dynamic-filters — dynamic sidebar facets (catId + filters)', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '600000', 10));

  let agent;

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
    expect(filterScenarios.length).to.be.above(0);
  });

  for (const scenario of filterScenarios) {
    it(`dynamic: ${scenario.label}`, async function () {
      const { categoryId, specs, kind } = scenario;

      const expectedCodes = expectedProductCodesForCategoryAndMultiFilter(
        filterProducts,
        categoryProducts,
        categoryId,
        specs
      );

      if (!expectedCodes.size) {
        // eslint-disable-next-line no-console
        console.log(`  skipped ${scenario.label} — no scoped products`);
        this.skip();
      }

      const filterQuery = specsToFilterQuery(specs, kind);
      const expected = await expectedCheckboxFacetsLikeApi(categoryId, filterQuery, excludedFields);
      const apiFields = await fetchDynamicSidebar(agent, categoryId, filterQuery);

      // eslint-disable-next-line no-console
      console.log(
        `\ndynamic ${scenario.label} | fixture products=${expectedCodes.size} | api fields=${apiFields.length}`
      );

      assertCheckboxFacetsMatch(
        apiFields,
        expected,
        'dynamic',
        scenario.label,
        excludedFields
      );
    });
  }

  after(function () {
    // eslint-disable-next-line no-console
    console.log(
      `\nDynamic sidebar tests: ${categoryIds.length} static + ${filterScenarios.length} dynamic scenarios\n`
    );
  });
});
