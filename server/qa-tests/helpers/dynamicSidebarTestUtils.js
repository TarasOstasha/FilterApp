const { expect } = require('chai');
const { API_FIELD_MAP } = require('./filterTestUtils');
const {
  expectedProductCodesForCategory,
  expectedProductCodesForCategoryAndMultiFilter,
  buildApiQueryWithCategory,
} = require('./categoryTestUtils');

/** API filter_fields.field_name → canonical Excel column */
const CANONICAL_BY_API_FIELD = Object.fromEntries(
  Object.entries(API_FIELD_MAP).map(([canonical, spec]) => [spec.apiParam, canonical])
);

/**
 * Visible filter-excel rows scoped to category (and optional active filter specs).
 * @param {object[]} filterProducts
 * @param {object[]} categoryProducts
 * @param {string|number} categoryId
 * @param {Record<string, string|string[]|{min:number,max:number}>} [filterSpecs]
 */
function getScopedFilterProducts(
  filterProducts,
  categoryProducts,
  categoryId,
  filterSpecs = {}
) {
  const codes = Object.keys(filterSpecs).length
    ? expectedProductCodesForCategoryAndMultiFilter(
        filterProducts,
        categoryProducts,
        categoryId,
        filterSpecs
      )
    : expectedProductCodesForCategory(categoryProducts, categoryId);

  return filterProducts.filter((p) => codes.has(p.product_code));
}

/**
 * Expected checkbox facet values keyed by API field_name (filter_fields.field_name).
 * @param {object[]} scopedProducts
 * @param {Set<string>} [excludedCanonicalFields]
 */
function expectedCheckboxFacetsByApiField(scopedProducts, excludedCanonicalFields = new Set()) {
  /** @type {Record<string, string[]>} */
  const byApiField = {};

  for (const [canonical, spec] of Object.entries(API_FIELD_MAP)) {
    if (spec.type !== 'checkbox') continue;
    if (excludedCanonicalFields.has(canonical)) continue;

    const tokens = new Set();
    for (const row of scopedProducts) {
      for (const token of row[`${canonical}_tokens`] || []) tokens.add(token);
    }

    byApiField[spec.apiParam] = [...tokens].sort((a, b) => a.localeCompare(b));
  }

  return byApiField;
}

/**
 * @param {object[]} apiFields
 * @param {'static'|'dynamic'} mode
 */
function checkboxValuesFromApiField(apiFields, apiFieldName, mode) {
  const field = apiFields.find((f) => f.field_name === apiFieldName);
  if (!field) return [];
  if (mode === 'static') {
    return Array.isArray(field.allowed_values) ? field.allowed_values : [];
  }
  return Array.isArray(field.values) ? field.values : [];
}

function sortFacetValues(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

/**
 * Assert checkbox sidebar facets match Excel-derived expectations.
 * @param {object[]} apiFields
 * @param {Record<string, string[]>} expectedByApiField
 * @param {'static'|'dynamic'} mode
 * @param {string} label
 * @param {Set<string>} [excludedCanonicalFields]
 */
function assertCheckboxFacetsMatch(
  apiFields,
  expectedByApiField,
  mode,
  label,
  excludedCanonicalFields = new Set()
) {
  for (const [apiFieldName, expected] of Object.entries(expectedByApiField)) {
    const canonical = CANONICAL_BY_API_FIELD[apiFieldName];
    if (!canonical || excludedCanonicalFields.has(canonical)) continue;

    const actual = checkboxValuesFromApiField(apiFields, apiFieldName, mode);

    if (!expected.length) {
      if (actual.length) {
        expect(actual, `${label} | ${apiFieldName} should be omitted or empty`).to.deep.equal([]);
      }
      continue;
    }

    expect(
      sortFacetValues(actual),
      `${label} | ${apiFieldName}`
    ).to.deep.equal(sortFacetValues(expected));
  }

  for (const apiField of apiFields) {
    const canonical = CANONICAL_BY_API_FIELD[apiField.field_name];
    if (!canonical) continue;
    const spec = API_FIELD_MAP[canonical];
    if (spec.type !== 'checkbox' || excludedCanonicalFields.has(canonical)) continue;

    const expected = expectedByApiField[apiField.field_name];
    if (!expected) continue;

    const actual = checkboxValuesFromApiField(apiFields, apiField.field_name, mode);
    expect(
      sortFacetValues(actual),
      `${label} | unexpected extra field ${apiField.field_name}`
    ).to.deep.equal(sortFacetValues(expected));
  }
}

/**
 * @param {import('supertest').SuperTest<Test>} agent
 * @param {string|number} categoryId
 */
async function fetchStaticSidebar(agent, categoryId) {
  const res = await agent.get('/api/filterField').query({ catId: String(categoryId) });
  expect(res.status).to.equal(200);
  expect(res.body).to.be.an('array');
  return res.body;
}

/**
 * @param {import('supertest').SuperTest<Test>} agent
 * @param {string|number} categoryId
 * @param {Record<string, string|string[]>} filterQuery
 */
async function fetchDynamicSidebar(agent, categoryId, filterQuery) {
  const res = await agent
    .get('/api/dynamic-filters')
    .query(buildApiQueryWithCategory(categoryId, filterQuery));
  expect(res.status).to.equal(200);
  expect(res.body).to.be.an('array');
  return res.body;
}

module.exports = {
  CANONICAL_BY_API_FIELD,
  getScopedFilterProducts,
  expectedCheckboxFacetsByApiField,
  checkboxValuesFromApiField,
  assertCheckboxFacetsMatch,
  fetchStaticSidebar,
  fetchDynamicSidebar,
  sortFacetValues,
};
