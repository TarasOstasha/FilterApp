const { expect } = require('chai');
const { getTestAgent } = require('../helpers/testServer');
const { bootstrapApiProductVisibility } = require('../helpers/apiTestBootstrap');
const { expectedCheckboxFacetsLikeApi } = require('../helpers/dbSidebarFacets');
const {
  expectedWidthRangeLikeApi,
  expectedHeightRangeLikeApi,
} = require('../helpers/dbRangeEndpoints');
const { Sequelize, QueryTypes } = require('sequelize');
const config = require('../../config/config.js')[process.env.NODE_ENV || 'test'];
const { visibleProductSql } = require('../../utils/productVisibility');

function createSequelize() {
  return new Sequelize(config.database, config.username, config.password, config);
}

/**
 * Find a search term that has products both under and over $50.
 */
async function discoverSearchPriceScenario() {
  const sequelize = createSequelize();
  try {
    const rows = await sequelize.query(
      `
      SELECT p.product_name, p.product_price, p.product_code
      FROM products p
      WHERE ${visibleProductSql('p')}
        AND p.product_price IS NOT NULL
        AND p.product_price > 0
        AND p.product_price < 50
        AND p.product_name IS NOT NULL
        AND POSITION(' ' IN TRIM(p.product_name)) > 0
      ORDER BY p.id
      LIMIT 400
      `,
      { type: QueryTypes.SELECT }
    );

    for (const row of rows) {
      const words = String(row.product_name)
        .trim()
        .split(/\s+/)
        .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
        .filter((w) => w.length >= 3);
      if (words.length < 1) continue;
      const searchTerms = words[0];
      // Prefer terms that also match something more expensive so facets differ with/without price
      const [countRow] = await sequelize.query(
        `
        SELECT
          COUNT(*) FILTER (WHERE p.product_price <= 50)::int AS under,
          COUNT(*) FILTER (WHERE p.product_price > 50)::int AS over
        FROM products p
        WHERE ${visibleProductSql('p')}
          AND (p.product_name ILIKE :pat OR p.product_code ILIKE :pat)
        `,
        {
          replacements: { pat: `%${searchTerms}%` },
          type: QueryTypes.SELECT,
        }
      );
      if ((countRow?.under || 0) < 1) continue;
      return {
        searchTerms,
        priceFilter: '0,50',
        under: countRow.under,
        over: countRow.over || 0,
      };
    }
    return null;
  } finally {
    await sequelize.close();
  }
}

describe('Search + Product Price — dynamic facets & dimension ranges', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '300000', 10));

  let agent;
  /** @type {{ searchTerms: string, priceFilter: string, under: number, over: number }|null} */
  let scenario = null;

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
    scenario = await discoverSearchPriceScenario();
    if (!scenario) {
      // eslint-disable-next-line no-console
      console.log('  skipped — no search+price scenario');
      this.skip();
    }
    // eslint-disable-next-line no-console
    console.log(
      `\n=== scenario search="${scenario.searchTerms}" price=0,50 under=${scenario.under} over=${scenario.over} ===`
    );
  });

  it('dynamic-filters with search+Product Price is narrower than search-only', async function () {
    const searchOnly = { searchTerms: scenario.searchTerms };
    const withPrice = {
      searchTerms: scenario.searchTerms,
      'Product Price': scenario.priceFilter,
    };

    const expectedSearch = await expectedCheckboxFacetsLikeApi(null, searchOnly, new Set());
    const expectedBoth = await expectedCheckboxFacetsLikeApi(null, withPrice, new Set());

    const resSearch = await agent.get('/api/dynamic-filters').query(searchOnly).expect(200);
    const resBoth = await agent.get('/api/dynamic-filters').query(withPrice).expect(200);

    expect(resSearch.body).to.be.an('array').that.is.not.empty;
    expect(resBoth.body).to.be.an('array');

    // At least one checkbox field should shrink (or stay equal) when price is applied
    const typeSearch = resSearch.body.find((f) => f.field_name === 'Product Type');
    const typeBoth = resBoth.body.find((f) => f.field_name === 'Product Type');
    if (typeSearch && expectedSearch['Product Type']) {
      expect([...typeSearch.values].sort()).to.deep.equal(
        [...expectedSearch['Product Type']].sort()
      );
    }
    if (typeBoth && expectedBoth['Product Type']) {
      expect([...typeBoth.values].sort()).to.deep.equal(
        [...expectedBoth['Product Type']].sort()
      );
      if (typeSearch) {
        expect(typeBoth.values.length).to.be.at.most(typeSearch.values.length);
      }
    }
  });

  it('width-range applies Product Price via product_price (not product_filters)', async function () {
    const query = {
      searchTerms: scenario.searchTerms,
      'Product Price': scenario.priceFilter,
    };
    const expected = await expectedWidthRangeLikeApi(null, query);
    const res = await agent.get('/api/products/width-range').query(query).expect(200);
    expect(res.body.min).to.equal(expected.min);
    expect(res.body.max).to.equal(expected.max);
  });

  it('height-range applies Product Price via product_price', async function () {
    const query = {
      searchTerms: scenario.searchTerms,
      'Product Price': scenario.priceFilter,
    };
    const expected = await expectedHeightRangeLikeApi(null, query);
    const res = await agent.get('/api/products/height-range').query(query).expect(200);
    expect(res.body.min).to.equal(expected.min);
    expect(res.body.max).to.equal(expected.max);
  });

  it('price-range still self-excludes Product Price', async function () {
    const base = { searchTerms: scenario.searchTerms };
    const withPrice = { ...base, 'Product Price': scenario.priceFilter };
    const a = await agent.get('/api/products/price-range').query(base).expect(200);
    const b = await agent.get('/api/products/price-range').query(withPrice).expect(200);
    expect(a.body.min).to.equal(b.body.min);
    expect(a.body.max).to.equal(b.body.max);
  });
});
