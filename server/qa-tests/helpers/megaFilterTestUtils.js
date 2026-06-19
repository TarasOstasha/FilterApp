const { expect } = require('chai');
const { buildApiQueryWithCategory } = require('./categoryTestUtils');
const { MEGA_LIMIT } = require('./dbMegaFilter');

/**
 * @param {import('supertest').SuperTest<Test>} agent
 * @param {string} searchTerms
 * @param {string} sortBy
 * @param {string|number|null} categoryId
 */
async function fetchMegaProducts(agent, searchTerms, sortBy, categoryId) {
  const query = { searchTerms, sortBy };
  if (categoryId != null) {
    Object.assign(query, buildApiQueryWithCategory(categoryId, {}));
  }

  const res = await agent.get('/api/products/mega').query(query);
  expect(res.status).to.equal(200);
  expect(res.body).to.be.an('array');
  return res.body;
}

/**
 * @param {object[]} apiProducts
 * @param {object[]} expectedProducts
 * @param {string} label
 */
function assertMegaProductsMatch(apiProducts, expectedProducts, label) {
  expect(apiProducts.length, `${label} count`).to.equal(expectedProducts.length);
  expect(apiProducts.length, `${label} mega limit`).to.be.at.most(MEGA_LIMIT);

  const apiCodes = apiProducts.map((p) => String(p.product_code ?? '').trim());
  const expectedCodes = expectedProducts.map((p) => p.product_code);
  expect(apiCodes, `${label} product_code order`).to.deep.equal(expectedCodes);

  for (const product of apiProducts) {
    expect(product).to.have.property('id');
    expect(product).to.have.property('product_name');
    expect(product).to.have.property('product_code');
  }
}

module.exports = {
  fetchMegaProducts,
  assertMegaProductsMatch,
};
