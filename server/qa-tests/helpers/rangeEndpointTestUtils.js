const { expect } = require('chai');
const { buildApiQueryWithCategory } = require('./categoryTestUtils');

/**
 * @param {import('supertest').SuperTest<Test>} agent
 * @param {string|number|null} categoryId
 * @param {Record<string, string|string[]>} filterQuery
 */
async function fetchPriceRange(agent, categoryId, filterQuery = {}) {
  const query =
    categoryId != null
      ? buildApiQueryWithCategory(categoryId, filterQuery)
      : { ...filterQuery };
  const res = await agent.get('/api/products/price-range').query(query);
  expect(res.status).to.equal(200);
  return res.body;
}

/**
 * @param {import('supertest').SuperTest<Test>} agent
 * @param {string|number|null} categoryId
 * @param {Record<string, string|string[]>} filterQuery
 */
async function fetchWidthRange(agent, categoryId, filterQuery = {}) {
  const query =
    categoryId != null
      ? buildApiQueryWithCategory(categoryId, filterQuery)
      : { ...filterQuery };
  const res = await agent.get('/api/products/width-range').query(query);
  expect(res.status).to.equal(200);
  return res.body;
}

/**
 * @param {import('supertest').SuperTest<Test>} agent
 * @param {string|number|null} categoryId
 * @param {Record<string, string|string[]>} filterQuery
 */
async function fetchHeightRange(agent, categoryId, filterQuery = {}) {
  const query =
    categoryId != null
      ? buildApiQueryWithCategory(categoryId, filterQuery)
      : { ...filterQuery };
  const res = await agent.get('/api/products/height-range').query(query);
  expect(res.status).to.equal(200);
  return res.body;
}

function assertPriceRangeBody(actual, expected, label) {
  expect(actual.min, `${label} min`).to.equal(expected.min);
  expect(actual.max, `${label} max`).to.equal(expected.max);
  expect(actual.breakpoints, `${label} breakpoints`).to.deep.equal(expected.breakpoints);
}

function assertDimensionRangeBody(actual, expected, label) {
  expect(actual.min, `${label} min`).to.equal(expected.min);
  expect(actual.max, `${label} max`).to.equal(expected.max);
  expect(actual.globalMin, `${label} globalMin`).to.equal(expected.globalMin);
  expect(actual.globalMax, `${label} globalMax`).to.equal(expected.globalMax);
}

module.exports = {
  fetchPriceRange,
  fetchWidthRange,
  fetchHeightRange,
  assertPriceRangeBody,
  assertDimensionRangeBody,
};
