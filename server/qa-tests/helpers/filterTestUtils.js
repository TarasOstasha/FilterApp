const { expect } = require('chai');
const { productHasCheckboxToken } = require('./excelProductLoader');

/**
 * Maps canonical Excel/test field names to live API query parameter names
 * (from filter_fields.field_name / client filterParams.ts).
 */
const API_FIELD_MAP = {
  Product_Type: { apiParam: 'Product Type', type: 'checkbox' },
  Backlit: { apiParam: 'Backlit', type: 'checkbox' },
  Booth_Size: { apiParam: 'Booth Size', type: 'checkbox' },
  Display_Width: { apiParam: 'Display Width', type: 'range' },
  Display_Height: { apiParam: 'Display Height', type: 'range' },
  Product_Price: { apiParam: 'Product Price', type: 'range' },
};

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeCheckboxValue(value) {
  return String(value).trim();
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function normalizeNumericValue(value) {
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * @param {string} field
 * @param {string|number} filterValue
 * @returns {Record<string, string|string[]>}
 */
function buildApiQueryForFilter(field, filterValue) {
  const spec = API_FIELD_MAP[field];
  if (!spec) throw new Error(`Unknown filter field: ${field}`);

  if (spec.type === 'checkbox') {
    return { [spec.apiParam]: normalizeCheckboxValue(filterValue) };
  }

  const n = normalizeNumericValue(filterValue);
  const pair = `${n},${n}`;
  return { [spec.apiParam]: pair };
}

/**
 * Full query for GET /api/products (matches client buildProductQueryParams defaults).
 * @param {Record<string, string|string[]>} filterQuery
 * @param {{ limit?: number, offset?: number, sortBy?: string }} [meta]
 */
function buildProductsRequestQuery(filterQuery, meta = {}) {
  return {
    limit: meta.limit ?? 27,
    offset: meta.offset ?? 0,
    sortBy: meta.sortBy ?? 'most_popular',
    ...filterQuery,
  };
}

/**
 * @param {import('supertest').SuperTest<Test>}
 */
async function fetchProductsPage(agent, query) {
  const res = await agent.get('/api/products').query(query);
  expect(res.status).to.equal(200);
  expect(res.body).to.have.property('products');
  expect(res.body).to.have.property('totalProducts');
  return res.body;
}

/**
 * Paginate until all products for the filter are retrieved.
 * @param {import('supertest').SuperTest<Test>} agent
 * @param {Record<string, unknown>} baseQuery
 */
async function fetchAllProductsForFilter(agent, baseQuery) {
  const first = await fetchProductsPage(
    agent,
    buildProductsRequestQuery(baseQuery, { limit: 1, offset: 0 })
  );
  const total = Number(first.totalProducts) || 0;
  if (total === 0) {
    return { products: [], totalProducts: 0, priceRange: first.priceRange };
  }

  const full = await fetchProductsPage(
    agent,
    buildProductsRequestQuery(baseQuery, { limit: total, offset: 0 })
  );
  return full;
}

/**
 * @param {object[]} products
 * @returns {Set<string>}
 */
function productCodesFromApi(products) {
  return new Set(
    products
      .map((p) => String(p.product_code ?? '').trim())
      .filter(Boolean)
  );
}

/**
 * Expected product_codes from Excel for a single filter value.
 * @param {object[]} excelProducts
 * @param {string} field
 * @param {string|number} filterValue
 */
function expectedProductCodesForFilter(excelProducts, field, filterValue) {
  const codes = new Set();
  const target = normalizeCheckboxValue(filterValue);

  for (const row of excelProducts) {
    if (API_FIELD_MAP[field].type === 'checkbox') {
      if (productHasCheckboxToken(row, field, target)) {
        codes.add(row.product_code);
      }
      continue;
    }

    const raw = row[field];
    if (raw == null || raw === '') continue;
    const rowNum = normalizeNumericValue(raw);
    const targetNum = normalizeNumericValue(filterValue);
    if (rowNum === targetNum) codes.add(row.product_code);
  }
  return codes;
}

/**
 * Verify each API product satisfies the active filter (defense in depth).
 * @param {object[]} apiProducts
 * @param {string} field
 * @param {string|number} filterValue
 * @param {Map<string, object>} excelByCode
 */
function assertProductsSatisfyFilter(apiProducts, field, filterValue, excelByCode) {
  const spec = API_FIELD_MAP[field];

  for (const product of apiProducts) {
    const code = String(product.product_code ?? '').trim();
    const excelRow = excelByCode.get(code);
    if (!excelRow) continue;

    if (spec.type === 'checkbox') {
      expect(
        productHasCheckboxToken(excelRow, field, filterValue),
        `${code} should include ${field} token "${filterValue}"`
      ).to.equal(true);
      continue;
    }

    const target = normalizeNumericValue(filterValue);
    if (field === 'Product_Price') {
      const price = normalizeNumericValue(product.product_price);
      expect(price).to.be.at.least(target);
      expect(price).to.be.at.most(target);
      continue;
    }

    const actual = normalizeNumericValue(excelRow[field]);
    expect(actual).to.equal(target, `${code} should have ${field}=${target}`);
  }
}

/**
 * Excel fixture is often a subset of the live DB — require all Excel-expected
 * product_codes to appear in the API result, but allow extra DB-only products.
 * @param {Set<string>} expected
 * @param {Set<string>} actual
 * @param {{ field: string, value: string|number, expectedCount: number, actualCount: number, excelCatalog?: Set<string> }} ctx
 */
function compareProductCodeSets(expected, actual, ctx) {
  const missing = [...expected].filter((c) => !actual.has(c));
  const extra = [...actual].filter((c) => !expected.has(c));

  const label = `[${ctx.field}=${ctx.value}] expected=${ctx.expectedCount} actual=${ctx.actualCount}`;

  expect(
    ctx.actualCount,
    `${label} — API returned fewer products than Excel expects`
  ).to.be.at.least(ctx.expectedCount);

  expect(
    missing,
    `${label} — missing product_codes: ${missing.slice(0, 10).join(', ')}`
  ).to.deep.equal([]);

  if (extra.length > 0 && ctx.logExtras !== false) {
    // eslint-disable-next-line no-console
    console.log(
      `${label} — ${extra.length} extra API product(s) not in Excel fixture (allowed when DB is superset)`
    );
  }
}

/**
 * Readable Mocha output line per filter case.
 */
function formatFilterCaseLog(field, value, expectedCount, actualCount) {
  return `filter=${field} | value=${value} | expected=${expectedCount} | actual=${actualCount}`;
}

/**
 * Optional cap to keep local runs practical (full Excel can have thousands of unique prices).
 * @param {Array<string|number>} values
 */
function applyUniqueValueCap(values) {
  const capRaw = process.env.QA_MAX_UNIQUE_VALUES_PER_FILTER;
  if (!capRaw) return values;
  const cap = parseInt(capRaw, 10);
  if (!Number.isFinite(cap) || cap <= 0) return values;
  return values.slice(0, cap);
}

module.exports = {
  API_FIELD_MAP,
  normalizeCheckboxValue,
  normalizeNumericValue,
  buildApiQueryForFilter,
  buildProductsRequestQuery,
  fetchAllProductsForFilter,
  productCodesFromApi,
  expectedProductCodesForFilter,
  assertProductsSatisfyFilter,
  compareProductCodeSets,
  formatFilterCaseLog,
  applyUniqueValueCap,
};
