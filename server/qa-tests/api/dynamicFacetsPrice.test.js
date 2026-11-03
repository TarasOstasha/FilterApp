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

/**
 * Find catId + search + width + height where dimensions narrow Product Type facets.
 */
async function discoverSearchDimensionFacetScenario() {
  const sequelize = createSequelize();
  try {
    const rows = await sequelize.query(
      `
      SELECT
        pc.category_id::int AS category_id,
        p.id AS product_id,
        p.product_name,
        MAX(CASE WHEN ff.field_name = 'Display Width'
          THEN CAST(regexp_replace(pf.filter_value, '[^0-9\\.]', '', 'g') AS FLOAT) END) AS width_in,
        MAX(CASE WHEN ff.field_name = 'Display Height'
          THEN CAST(regexp_replace(pf.filter_value, '[^0-9\\.]', '', 'g') AS FLOAT) END) AS height_in
      FROM products p
      JOIN product_categories pc ON pc.product_id = p.id
      JOIN product_filters pf ON pf.product_id = p.id
      JOIN filter_fields ff ON ff.id = pf.filter_field_id
        AND ff.field_name IN ('Display Width', 'Display Height')
      WHERE ${visibleProductSql('p')}
        AND p.product_name IS NOT NULL
        AND POSITION(' ' IN TRIM(p.product_name)) > 0
      GROUP BY pc.category_id, p.id, p.product_name
      HAVING
        MAX(CASE WHEN ff.field_name = 'Display Width'
          THEN CAST(regexp_replace(pf.filter_value, '[^0-9\\.]', '', 'g') AS FLOAT) END) IS NOT NULL
        AND MAX(CASE WHEN ff.field_name = 'Display Height'
          THEN CAST(regexp_replace(pf.filter_value, '[^0-9\\.]', '', 'g') AS FLOAT) END) IS NOT NULL
      ORDER BY p.id
      LIMIT 250
      `,
      { type: QueryTypes.SELECT }
    );

    for (const row of rows) {
      const words = String(row.product_name)
        .trim()
        .split(/\s+/)
        .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
        .filter((w) => w.length >= 3);
      if (!words.length) continue;

      const searchTerms = words[0];
      const w = parseFloat(row.width_in);
      const h = parseFloat(row.height_in);
      if (!Number.isFinite(w) || !Number.isFinite(h)) continue;

      // Tight band around this product so many search matches drop out
      const widthFilter = `${Math.max(0, w - 0.5)},${w + 0.5}`;
      const heightFilter = `${Math.max(0, h - 0.5)},${h + 0.5}`;
      const catId = String(row.category_id);

      const searchOnly = { searchTerms, catId };
      const withDims = {
        searchTerms,
        catId,
        'Display Width': widthFilter,
        'Display Height': heightFilter,
      };

      const facetsSearch = await expectedCheckboxFacetsLikeApi(
        catId,
        { searchTerms },
        new Set()
      );
      const facetsDims = await expectedCheckboxFacetsLikeApi(
        catId,
        {
          searchTerms,
          'Display Width': widthFilter,
          'Display Height': heightFilter,
        },
        new Set()
      );

      const typeSearch = facetsSearch['Product Type'] || [];
      const typeDims = facetsDims['Product Type'] || [];
      if (typeSearch.length < 2) continue;
      if (typeDims.length === 0) continue;
      if (typeDims.length >= typeSearch.length) continue;

      return {
        catId,
        searchTerms,
        widthFilter,
        heightFilter,
        typeSearchCount: typeSearch.length,
        typeDimsCount: typeDims.length,
        searchOnly,
        withDims,
      };
    }
    return null;
  } finally {
    await sequelize.close();
  }
}

describe('Search + Display Width/Height — dynamic facets match /products scope', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '300000', 10));

  let agent;
  /** @type {Awaited<ReturnType<typeof discoverSearchDimensionFacetScenario>>} */
  let scenario = null;

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
    scenario = await discoverSearchDimensionFacetScenario();
    if (!scenario) {
      // eslint-disable-next-line no-console
      console.log('  skipped — no search+width+height facet scenario');
      this.skip();
    }
    // eslint-disable-next-line no-console
    console.log(
      `\n=== dim facet scenario catId=${scenario.catId} search="${scenario.searchTerms}" ` +
        `W=${scenario.widthFilter} H=${scenario.heightFilter} ` +
        `types ${scenario.typeSearchCount}→${scenario.typeDimsCount} ===`
    );
  });

  it('dynamic-filters with search+width+height+catId matches DB facet SQL', async function () {
    const expected = await expectedCheckboxFacetsLikeApi(
      scenario.catId,
      {
        searchTerms: scenario.searchTerms,
        'Display Width': scenario.widthFilter,
        'Display Height': scenario.heightFilter,
      },
      new Set()
    );

    const res = await agent
      .get('/api/dynamic-filters')
      .query({
        catId: scenario.catId,
        searchTerms: scenario.searchTerms,
        'Display Width': scenario.widthFilter,
        'Display Height': scenario.heightFilter,
      })
      .expect(200);

    expect(res.body).to.be.an('array');
    const typeField = res.body.find((f) => f.field_name === 'Product Type');
    expect(typeField, 'Product Type field').to.exist;
    expect([...typeField.values].sort()).to.deep.equal(
      [...(expected['Product Type'] || [])].sort()
    );
  });

  it('dimensions narrow Product Type vs search+catId alone', async function () {
    const resSearch = await agent
      .get('/api/dynamic-filters')
      .query({ catId: scenario.catId, searchTerms: scenario.searchTerms })
      .expect(200);
    const resDims = await agent
      .get('/api/dynamic-filters')
      .query({
        catId: scenario.catId,
        searchTerms: scenario.searchTerms,
        'Display Width': scenario.widthFilter,
        'Display Height': scenario.heightFilter,
      })
      .expect(200);

    const typeSearch = resSearch.body.find((f) => f.field_name === 'Product Type');
    const typeDims = resDims.body.find((f) => f.field_name === 'Product Type');
    expect(typeSearch).to.exist;
    expect(typeDims).to.exist;
    expect(typeDims.values.length).to.be.below(typeSearch.values.length);
  });

  it('Product Type facets ⊆ types on /products with same filters', async function () {
    const productsRes = await agent
      .get('/api/products')
      .query({
        catId: scenario.catId,
        searchTerms: scenario.searchTerms,
        'Display Width': scenario.widthFilter,
        'Display Height': scenario.heightFilter,
        limit: 500,
        offset: 0,
        sortBy: 'most_popular',
      })
      .expect(200);

    const productIds = (productsRes.body.products || []).map((p) => p.id);
    expect(productIds.length).to.be.above(0);

    const sequelize = createSequelize();
    let typesOnProducts = [];
    try {
      const rows = await sequelize.query(
        `
        SELECT DISTINCT TRIM(pf.filter_value) AS val
        FROM product_filters pf
        JOIN filter_fields ff ON ff.id = pf.filter_field_id AND ff.field_name = 'Product Type'
        WHERE pf.product_id IN (:ids)
        ORDER BY 1
        `,
        { replacements: { ids: productIds }, type: QueryTypes.SELECT }
      );
      typesOnProducts = rows.map((r) => String(r.val).trim()).filter(Boolean);
    } finally {
      await sequelize.close();
    }

    const facetsRes = await agent
      .get('/api/dynamic-filters')
      .query({
        catId: scenario.catId,
        searchTerms: scenario.searchTerms,
        'Display Width': scenario.widthFilter,
        'Display Height': scenario.heightFilter,
      })
      .expect(200);

    const typeField = facetsRes.body.find((f) => f.field_name === 'Product Type');
    expect(typeField).to.exist;
    for (const val of typeField.values) {
      expect(typesOnProducts, `facet "${val}" must appear on /products set`).to.include(val);
    }
    expect([...typeField.values].sort()).to.deep.equal([...typesOnProducts].sort());
  });

  it('width-range still self-excludes Display Width when height+search applied', async function () {
    const base = {
      catId: scenario.catId,
      searchTerms: scenario.searchTerms,
      'Display Height': scenario.heightFilter,
    };
    const withWidth = { ...base, 'Display Width': scenario.widthFilter };
    const a = await agent.get('/api/products/width-range').query(base).expect(200);
    const b = await agent.get('/api/products/width-range').query(withWidth).expect(200);
    // Self-exclusion: applying Display Width must not shrink the width rail
    expect(a.body.min).to.equal(b.body.min);
    expect(a.body.max).to.equal(b.body.max);
  });
});
