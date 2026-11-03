const { expect } = require('chai');
const { Sequelize, QueryTypes } = require('sequelize');
const config = require('../../config/config.js')[process.env.NODE_ENV || 'test'];
const { getTestAgent } = require('../helpers/testServer');
const { visibleProductSql } = require('../../utils/productVisibility');
const { appendSearchTermsSql, parseSearchWords } = require('../../utils/filterQuery');
const {
  fetchAllProductsForFilter,
  productCodesFromApi,
} = require('../helpers/filterTestUtils');
const { expectedCheckboxFacetsLikeApi } = require('../helpers/dbSidebarFacets');
const { expectedPriceRangeLikeApi } = require('../helpers/dbRangeEndpoints');
const { bootstrapApiProductVisibility } = require('../helpers/apiTestBootstrap');

function createSequelize() {
  return new Sequelize(config.database, config.username, config.password, config);
}

/**
 * Discover a product with a multi-word name and a checkbox filter value for AND tests.
 */
async function discoverSearchScenario() {
  const sequelize = createSequelize();
  try {
    const rows = await sequelize.query(
      `
      SELECT
        p.id,
        p.product_code,
        p.product_name,
        ff.field_name,
        pf.filter_value
      FROM products p
      JOIN product_filters pf ON pf.product_id = p.id
      JOIN filter_fields ff ON ff.id = pf.filter_field_id
      WHERE ${visibleProductSql('p')}
        AND ff.field_type = 'checkbox'
        AND TRIM(pf.filter_value) <> ''
        AND p.product_name IS NOT NULL
        AND POSITION(' ' IN TRIM(p.product_name)) > 0
      ORDER BY p.id
      LIMIT 200
      `,
      { type: QueryTypes.SELECT }
    );

    for (const row of rows) {
      const words = String(row.product_name)
        .trim()
        .split(/\s+/)
        .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
        .filter((w) => w.length >= 3);
      if (words.length < 2) continue;

      return {
        searchTerms: `${words[0]} ${words[1]}`,
        fieldName: row.field_name,
        filterValue: String(row.filter_value).trim(),
        productCode: String(row.product_code).trim(),
      };
    }
    return null;
  } finally {
    await sequelize.close();
  }
}

async function expectedCodesForSearch(searchTerms, extraFilters = {}) {
  const sequelize = createSequelize();
  const replacements = {};
  let where = `WHERE ${visibleProductSql('p')}`;
  where = appendSearchTermsSql(where, replacements, searchTerms);

  let joins = '';
  let idx = 0;
  for (const [fieldName, value] of Object.entries(extraFilters)) {
    const fieldRows = await sequelize.query(
      `SELECT id FROM filter_fields WHERE field_name = :fieldName LIMIT 1`,
      { replacements: { fieldName }, type: QueryTypes.SELECT }
    );
    const fieldId = fieldRows[0]?.id;
    if (!fieldId) continue;
    const key = `fv${idx}`;
    replacements[key] = value;
    joins += `
      JOIN product_filters pf${idx}
        ON pf${idx}.product_id = p.id
       AND pf${idx}.filter_field_id = ${fieldId}
       AND pf${idx}.filter_value = :${key}
    `;
    idx += 1;
  }

  try {
    const rows = await sequelize.query(
      `
      SELECT DISTINCT p.product_code
      FROM products p
      ${joins}
      ${where}
      `,
      { replacements, type: QueryTypes.SELECT }
    );
    return new Set(rows.map((r) => String(r.product_code).trim()).filter(Boolean));
  } finally {
    await sequelize.close();
  }
}

describe('GET /api/products — unified searchTerms', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '300000', 10));

  let agent;
  /** @type {{ searchTerms: string, fieldName: string, filterValue: string, productCode: string }|null} */
  let scenario = null;

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
    scenario = await discoverSearchScenario();
    if (!scenario) {
      // eslint-disable-next-line no-console
      console.log('  skipped unified searchTerms suite — no multi-word product scenario');
      this.skip();
    }
    // eslint-disable-next-line no-console
    console.log(
      `\n=== searchTerms scenario: "${scenario.searchTerms}" + ${scenario.fieldName}=${scenario.filterValue} ===`
    );
  });

  it('searchTerms alone returns matching products (multi-word AND)', async function () {
    const expected = await expectedCodesForSearch(scenario.searchTerms);
    expect(expected.size).to.be.above(0);
    expect(expected.has(scenario.productCode)).to.equal(true);

    const body = await fetchAllProductsForFilter(agent, {
      searchTerms: scenario.searchTerms,
      sortBy: 'most_popular',
    });
    const actual = productCodesFromApi(body.products || []);
    expect([...actual].sort()).to.deep.equal([...expected].sort());
    expect(Number(body.totalProducts)).to.equal(expected.size);
  });

  it('searchTerms AND checkbox filter combine correctly', async function () {
    const filters = { [scenario.fieldName]: scenario.filterValue };
    const expected = await expectedCodesForSearch(scenario.searchTerms, filters);
    expect(expected.size).to.be.above(0);
    expect(expected.has(scenario.productCode)).to.equal(true);

    const body = await fetchAllProductsForFilter(agent, {
      searchTerms: scenario.searchTerms,
      sortBy: 'most_popular',
      ...filters,
    });
    const actual = productCodesFromApi(body.products || []);
    expect([...actual].sort()).to.deep.equal([...expected].sort());

    // Intersection must be subset of search-only results
    const searchOnly = await expectedCodesForSearch(scenario.searchTerms);
    for (const code of actual) {
      expect(searchOnly.has(code)).to.equal(true);
    }
  });

  it('returns empty results for nonsense searchTerms', async function () {
    const nonsense = `zzznomatch${Date.now()}qqq`;
    expect(parseSearchWords(nonsense)).to.deep.equal([nonsense]);

    const body = await fetchAllProductsForFilter(agent, {
      searchTerms: nonsense,
      sortBy: 'most_popular',
    });
    expect(body.products || []).to.deep.equal([]);
    expect(Number(body.totalProducts)).to.equal(0);
  });

  it('clearing searchTerms (omit param) restores broader checkbox-only results', async function () {
    const filters = { [scenario.fieldName]: scenario.filterValue };
    const withSearch = await fetchAllProductsForFilter(agent, {
      searchTerms: scenario.searchTerms,
      sortBy: 'most_popular',
      ...filters,
    });
    const withoutSearch = await fetchAllProductsForFilter(agent, {
      sortBy: 'most_popular',
      ...filters,
    });

    const withCodes = productCodesFromApi(withSearch.products || []);
    const withoutCodes = productCodesFromApi(withoutSearch.products || []);
    expect(withoutCodes.size).to.be.at.least(withCodes.size);
    for (const code of withCodes) {
      expect(withoutCodes.has(code)).to.equal(true);
    }
  });

  it('paginates search results with default 27 page size', async function () {
    const res = await agent
      .get('/api/products')
      .query({
        searchTerms: scenario.searchTerms,
        sortBy: 'most_popular',
        limit: 27,
        offset: 0,
      })
      .expect(200);

    expect(res.body.products.length).to.be.at.most(27);
    expect(Number(res.body.totalProducts)).to.be.at.least(res.body.products.length);
  });
});

async function fetchDynamicFiltersRaw(agent, query) {
  const res = await agent.get('/api/dynamic-filters').query(query);
  expect(res.status).to.equal(200);
  expect(res.body).to.be.an('array');
  return res.body;
}

describe('GET /api/dynamic-filters — searchTerms facets', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '300000', 10));

  let agent;
  /** @type {{ searchTerms: string, fieldName: string, filterValue: string }|null} */
  let scenario = null;

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
    scenario = await discoverSearchScenario();
    if (!scenario) this.skip();
  });

  it('narrows checkbox facets under searchTerms', async function () {
    const query = { searchTerms: scenario.searchTerms };
    const expected = await expectedCheckboxFacetsLikeApi(null, query, new Set());
    const apiFields = await fetchDynamicFiltersRaw(agent, query);

    const facet = apiFields.find((f) => f.field_name === scenario.fieldName);
    expect(facet, `expected facet for ${scenario.fieldName}`).to.exist;
    expect(facet.values).to.include(scenario.filterValue);

    if (expected[scenario.fieldName]) {
      expect([...facet.values].sort()).to.deep.equal(
        [...expected[scenario.fieldName]].sort()
      );
    }
  });

  it('cleared search widens facets vs search-scoped facets', async function () {
    const withSearch = await fetchDynamicFiltersRaw(agent, {
      searchTerms: scenario.searchTerms,
      [scenario.fieldName]: scenario.filterValue,
    });
    const withoutSearch = await fetchDynamicFiltersRaw(agent, {
      [scenario.fieldName]: scenario.filterValue,
    });

    const withFacet = withSearch.find((f) => f.field_name === scenario.fieldName);
    const withoutFacet = withoutSearch.find((f) => f.field_name === scenario.fieldName);
    expect(withFacet).to.exist;
    expect(withoutFacet).to.exist;
    expect(withoutFacet.values.length).to.be.at.least(withFacet.values.length);
  });
});

describe('GET /api/products/price-range — searchTerms', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '300000', 10));

  let agent;
  let scenario = null;

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
    scenario = await discoverSearchScenario();
    if (!scenario) this.skip();
  });

  it('price range respects searchTerms', async function () {
    const query = { searchTerms: scenario.searchTerms };
    const expected = await expectedPriceRangeLikeApi(null, query);
    const res = await agent.get('/api/products/price-range').query(query).expect(200);
    expect(res.body.min).to.equal(expected.min);
    expect(res.body.max).to.equal(expected.max);
  });
});
