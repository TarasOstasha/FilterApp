const { expect } = require('chai');
const { buildApiQueryWithCategory } = require('./categoryTestUtils');
const { buildProductsRequestQuery, fetchProductsPage } = require('./filterTestUtils');

const SORT_OPTIONS = ['most_popular', 'price_asc', 'price_desc'];

/**
 * @param {Record<string, string|string[]>} filterQuery
 * @param {string|number|null} categoryId
 */
function buildProductsQuery(filterQuery, categoryId) {
  if (categoryId != null) {
    return buildApiQueryWithCategory(categoryId, filterQuery);
  }
  return { ...filterQuery };
}

/**
 * @param {import('supertest').SuperTest<Test>} agent
 * @param {Record<string, unknown>} baseQuery
 * @param {{ limit?: number, offset?: number, sortBy?: string }} meta
 */
async function fetchProducts(agent, baseQuery, meta = {}) {
  return fetchProductsPage(agent, buildProductsRequestQuery(baseQuery, meta));
}

/**
 * @param {import('supertest').SuperTest<Test>} agent
 * @param {Record<string, unknown>} baseQuery
 * @param {string} sortBy
 * @param {number} pageSize
 * @param {number} maxFullUnion
 */
async function assertPaginationAndSort(agent, baseQuery, sortBy, pageSize, maxFullUnion, label) {
  const probe = await fetchProducts(agent, baseQuery, { sortBy, limit: 1, offset: 0 });
  const total = Number(probe.totalProducts) || 0;

  if (total === 0) {
    return { skipped: true, total: 0 };
  }

  const unionLimit = Math.min(total, maxFullUnion);
  const reference = await fetchProducts(agent, baseQuery, {
    sortBy,
    limit: unionLimit,
    offset: 0,
  });

  expect(reference.products.length, `${label} reference length`).to.equal(unionLimit);

  const refCodes = reference.products.map((p) => p.product_code);
  /** @type {object[]} */
  const paged = [];

  for (let offset = 0; offset < unionLimit; offset += pageSize) {
    const remaining = unionLimit - offset;
    const limit = Math.min(pageSize, remaining);
    const page = Math.floor(offset / pageSize);
    const body = await fetchProducts(agent, baseQuery, { sortBy, limit, offset });
    expect(Number(body.totalProducts), `${label} totalProducts page ${page}`).to.equal(total);
    expect(body.products.length, `${label} page ${page} length`).to.equal(limit);
    paged.push(...body.products);
  }

  expect(paged.length, `${label} paged union length`).to.equal(unionLimit);
  const pageCodes = paged.map((p) => p.product_code);
  expect(pageCodes, `${label} paged codes match reference order`).to.deep.equal(refCodes);
  expect(new Set(pageCodes).size, `${label} no duplicate codes in pages`).to.equal(pageCodes.length);

  if (total > unionLimit) {
    const tail = await fetchProducts(agent, baseQuery, {
      sortBy,
      limit: pageSize,
      offset: unionLimit,
    });
    expect(Number(tail.totalProducts)).to.equal(total);
    expect(tail.products.length).to.equal(Math.min(pageSize, total - unionLimit));
  }

  if (total > unionLimit + pageSize) {
    const beyond = await fetchProducts(agent, baseQuery, {
      sortBy,
      limit: pageSize,
      offset: total + 100,
    });
    expect(Number(beyond.totalProducts)).to.equal(total);
    expect(beyond.products).to.deep.equal([]);
  }

  return { skipped: false, total };
}

module.exports = {
  SORT_OPTIONS,
  buildProductsQuery,
  fetchProducts,
  assertPaginationAndSort,
};
