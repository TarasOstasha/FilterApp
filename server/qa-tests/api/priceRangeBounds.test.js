const { expect } = require('chai');
const { getTestAgent } = require('../helpers/testServer');
const {
  snapMinToBreakpoint,
  snapMaxToBreakpoint,
  parsePriceBreakpoints,
} = require('../../utils/priceBreakpoints');
const { expectedPriceRangeLikeApi } = require('../helpers/dbRangeEndpoints');
const { bootstrapApiProductVisibility } = require('../helpers/apiTestBootstrap');
const { Sequelize, QueryTypes } = require('sequelize');
const config = require('../../config/config.js')[process.env.NODE_ENV || 'test'];
const { visibleProductSql } = require('../../utils/productVisibility');

function createSequelize() {
  return new Sequelize(config.database, config.username, config.password, config);
}

async function discoverSearchAndPriceScenario() {
  const sequelize = createSequelize();
  try {
    const rows = await sequelize.query(
      `
      SELECT p.product_name, p.product_price, p.product_code
      FROM products p
      WHERE ${visibleProductSql('p')}
        AND p.product_price IS NOT NULL
        AND p.product_price > 0
        AND p.product_name IS NOT NULL
        AND POSITION(' ' IN TRIM(p.product_name)) > 0
      ORDER BY p.id
      LIMIT 300
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
      const searchTerms = `${words[0]} ${words[1]}`;
      const price = parseFloat(row.product_price);
      if (!Number.isFinite(price) || price <= 0) continue;
      return { searchTerms, samplePrice: price, productCode: String(row.product_code).trim() };
    }
    return null;
  } finally {
    await sequelize.close();
  }
}

describe('GET /api/products/price-range — bounds behavior', function () {
  this.timeout(parseInt(process.env.QA_TEST_TIMEOUT_MS || '300000', 10));

  let agent;
  /** @type {{ searchTerms: string, samplePrice: number, productCode: string }|null} */
  let scenario = null;
  /** @type {number[]} */
  let breakpoints = [];

  before(async function () {
    await bootstrapApiProductVisibility();
    agent = getTestAgent();
    scenario = await discoverSearchAndPriceScenario();
    if (!scenario) {
      // eslint-disable-next-line no-console
      console.log('  skipped price-range bounds — no search scenario');
      this.skip();
    }

    const fieldRes = await agent.get('/api/filterField').query({ catId: '51' });
    const priceField = (fieldRes.body || []).find((f) => f.field_name === 'Product Price');
    breakpoints = parsePriceBreakpoints(
      Array.isArray(priceField?.allowed_values)
        ? priceField.allowed_values.join(',')
        : priceField?.allowed_values
    );
    if (!breakpoints.length) {
      breakpoints = parsePriceBreakpoints(
        '0,50,100,500,1000,5000,10000,20000,50000,100000'
      );
    }
  });

  it('excludes active Product Price from rail calculation (self-exclusion)', async function () {
    const base = { searchTerms: scenario.searchTerms };
    const withPrice = {
      ...base,
      'Product Price': '500,1000',
    };

    const expected = await expectedPriceRangeLikeApi(null, base);
    const resWithout = await agent.get('/api/products/price-range').query(base).expect(200);
    const resWith = await agent.get('/api/products/price-range').query(withPrice).expect(200);

    expect(resWithout.body.min).to.equal(expected.min);
    expect(resWithout.body.max).to.equal(expected.max);
    expect(resWith.body.min).to.equal(resWithout.body.min);
    expect(resWith.body.max).to.equal(resWithout.body.max);
  });

  it('narrows rails for search-only (no other filters)', async function () {
    const query = { searchTerms: scenario.searchTerms };
    const expected = await expectedPriceRangeLikeApi(null, query);
    const res = await agent.get('/api/products/price-range').query(query).expect(200);

    expect(res.body.min).to.equal(expected.min);
    expect(res.body.max).to.equal(expected.max);
    expect(res.body.breakpoints).to.be.an('array').that.is.not.empty;

    // Containment: snapped rail must fully contain sample price when results exist
    if (expected.max > 0 || expected.min > 0) {
      expect(res.body.min).to.be.at.most(scenario.samplePrice);
      expect(res.body.max).to.be.at.least(scenario.samplePrice);
    }
  });

  it('returns containment snaps for known actual prices', async function () {
    const min = snapMinToBreakpoint(breakpoints, 223);
    const max = snapMaxToBreakpoint(breakpoints, 1013);
    expect(min).to.equal(100);
    expect(max).to.equal(5000);
  });

  it('custom Product Price query values do not change available rails', async function () {
    const custom = '223,1013';
    const resA = await agent
      .get('/api/products/price-range')
      .query({ 'Product Price': custom })
      .expect(200);
    const resB = await agent.get('/api/products/price-range').query({}).expect(200);

    // With no other scope, both should reflect global snapped range
    expect(resA.body.min).to.equal(resB.body.min);
    expect(resA.body.max).to.equal(resB.body.max);
  });
});
