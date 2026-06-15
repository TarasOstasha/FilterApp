const { expect } = require('chai');
const { productHasCheckboxToken } = require('./excelProductLoader');

const MAX_REASONABLE_DIMENSION_INCHES = 500;

/** @type {Set<string>} product_codes with hide_product=Y — excluded from API expectations */
let hiddenProductCodes = new Set();

/**
 * @param {Iterable<string>} codes
 */
function setHiddenProductCodes(codes) {
  hiddenProductCodes = new Set(
    [...codes].map((c) => String(c).trim()).filter(Boolean)
  );
}

function getHiddenProductCodes() {
  return hiddenProductCodes;
}

/**
 * API omits hide_product=Y; expected sets must match visible catalog only.
 * @param {Set<string>} codes
 * @returns {Set<string>}
 */
function visibleProductCodesOnly(codes) {
  if (!hiddenProductCodes.size) return codes;
  return new Set([...codes].filter((c) => !hiddenProductCodes.has(c)));
}

/**
 * Maps canonical Excel/test field names to live API query parameter names
 * (from filter_fields.field_name / client filterParams.ts).
 */
const API_FIELD_MAP = {
  Product_Type: { apiParam: 'Product Type', type: 'checkbox' },
  Backlit: { apiParam: 'Backlit', type: 'checkbox' },
  Booth_Size: { apiParam: 'Booth Size', type: 'checkbox' },
  Print_Type: { apiParam: 'Print Type', type: 'checkbox' },
  Product_Details: { apiParam: 'Product Details', type: 'checkbox' },
  Frame_Hardware: { apiParam: 'Frame Hardware', type: 'checkbox' },
  Display_Shape: { apiParam: 'Display Shape', type: 'checkbox' },
  Other_Accessories: { apiParam: 'Other / Accessories', type: 'checkbox' },
  Hanging_Sign_Shapes: { apiParam: 'Hanging Sign Shapes', type: 'checkbox' },
  Turntable_Type: { apiParam: 'Turntable Type', type: 'checkbox' },
  Motor_Capacity: { apiParam: 'Motor Capacity', type: 'checkbox' },
  Flooring_Type: { apiParam: 'Flooring Type', type: 'checkbox' },
  Print_Facility: { apiParam: 'Print Facility', type: 'checkbox' },
  Features: { apiParam: 'Features', type: 'checkbox' },
  Outdoor_Type: { apiParam: 'Outdoor Type', type: 'checkbox' },
  Product_Line: { apiParam: 'Product Line', type: 'checkbox' },
  Display_Width: { apiParam: 'Display Width', type: 'range' },
  Display_Height: { apiParam: 'Display Height', type: 'range' },
  Product_Price: { apiParam: 'Product Price', type: 'priceRange' },
};

/** Excel checkbox field → live API query key (filter_fields.field_name). */
const CHECKBOX_API_FIELD_NAMES = Object.fromEntries(
  Object.entries(API_FIELD_MAP)
    .filter(([, spec]) => spec.type === 'checkbox')
    .map(([excelField, spec]) => [excelField, spec.apiParam])
);

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
 * @param {string} apiParam
 * @param {number} min
 * @param {number} max
 */
function buildRangeQueryParam(apiParam, min, max) {
  return { [apiParam]: `${min},${max}` };
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
  return buildRangeQueryParam(spec.apiParam, n, n);
}

/**
 * @param {string} field
 * @param {number} min
 * @param {number} max
 */
function buildApiQueryForRange(field, min, max) {
  const spec = API_FIELD_MAP[field];
  if (!spec || spec.type !== 'range') {
    throw new Error(`${field} is not a range field`);
  }
  return buildRangeQueryParam(spec.apiParam, min, max);
}

/**
 * Product Price filters products.product_price (BETWEEN), not product_filters rows.
 * @param {number} min
 * @param {number} max
 */
function buildApiQueryForPriceRange(min, max) {
  return buildRangeQueryParam('Product Price', min, max);
}

/**
 * Multiple filters — checkbox values may be string or string[] (AND per API).
 * @param {Record<string, string | string[] | number>} filterSpecs keyed by canonical field
 */
function buildApiQueryMulti(filterSpecs) {
  /** @type {Record<string, string | string[]>} */
  const query = {};
  for (const [field, value] of Object.entries(filterSpecs)) {
    const spec = API_FIELD_MAP[field];
    if (!spec) throw new Error(`Unknown filter field: ${field}`);

    if (spec.type === 'checkbox') {
      if (Array.isArray(value)) {
        query[spec.apiParam] = value.map((v) => normalizeCheckboxValue(v));
      } else {
        query[spec.apiParam] = normalizeCheckboxValue(value);
      }
      continue;
    }

    if (spec.type === 'range') {
      const { min, max } = value;
      Object.assign(query, buildApiQueryForRange(field, min, max));
      continue;
    }

    if (spec.type === 'priceRange') {
      const { min, max } = value;
      Object.assign(query, buildApiQueryForPriceRange(min, max));
    }
  }
  return query;
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
 * Expected product_codes for a single checkbox atomic token.
 */
function expectedProductCodesForCheckbox(excelProducts, field, filterValue) {
  const codes = new Set();
  const target = normalizeCheckboxValue(filterValue);
  for (const row of excelProducts) {
    if (productHasCheckboxToken(row, field, target)) codes.add(row.product_code);
  }
  return visibleProductCodesOnly(codes);
}

/**
 * API range fields: product_filters.filter_value numeric BETWEEN min and max (inclusive).
 * Point test uses min === max.
 */
function expectedProductCodesForDimensionRange(excelProducts, field, min, max) {
  const codes = new Set();
  for (const row of excelProducts) {
    const raw = row[field];
    if (raw == null || raw === '') continue;
    const n = normalizeNumericValue(raw);
    if (!Number.isFinite(n) || n > MAX_REASONABLE_DIMENSION_INCHES) continue;
    if (n >= min && n <= max) codes.add(row.product_code);
  }
  return visibleProductCodesOnly(codes);
}

/**
 * Product Price: API uses products.product_price BETWEEN min and max (inclusive).
 */
function expectedProductCodesForPriceRange(excelProducts, min, max) {
  const codes = new Set();
  for (const row of excelProducts) {
    const price = normalizeNumericValue(row.Product_Price);
    if (!Number.isFinite(price)) continue;
    if (price >= min && price <= max) codes.add(row.product_code);
  }
  return visibleProductCodesOnly(codes);
}

/**
 * Expected product_codes from Excel for a single filter value.
 */
function expectedProductCodesForFilter(excelProducts, field, filterValue) {
  const spec = API_FIELD_MAP[field];
  if (spec.type === 'checkbox') {
    return expectedProductCodesForCheckbox(excelProducts, field, filterValue);
  }
  const n = normalizeNumericValue(filterValue);
  if (field === 'Product_Price') {
    return expectedProductCodesForPriceRange(excelProducts, n, n);
  }
  return expectedProductCodesForDimensionRange(excelProducts, field, n, n);
}

/**
 * AND across fields; checkbox fields require every listed token on the product.
 * @param {object[]} excelProducts
 * @param {Record<string, string | string[] | { min: number, max: number }>} filterSpecs
 */
function expectedProductCodesForMultiFilter(excelProducts, filterSpecs) {
  let codes = new Set(excelProducts.map((p) => p.product_code));

  for (const [field, value] of Object.entries(filterSpecs)) {
    const spec = API_FIELD_MAP[field];
    let fieldCodes;

    if (spec.type === 'checkbox') {
      const tokens = Array.isArray(value) ? value : [value];
      fieldCodes = new Set();
      for (const row of excelProducts) {
        const hasAll = tokens.every((t) => productHasCheckboxToken(row, field, t));
        if (hasAll) fieldCodes.add(row.product_code);
      }
    } else if (spec.type === 'range') {
      fieldCodes = expectedProductCodesForDimensionRange(
        excelProducts,
        field,
        value.min,
        value.max
      );
    } else if (spec.type === 'priceRange') {
      fieldCodes = expectedProductCodesForPriceRange(excelProducts, value.min, value.max);
    }

    codes = new Set([...codes].filter((c) => fieldCodes.has(c)));
  }

  return visibleProductCodesOnly(codes);
}

/**
 * OR within one checkbox field (union of tokens) — for documenting UI intent vs API AND.
 */
function expectedProductCodesForCheckboxOr(excelProducts, field, tokens) {
  const codes = new Set();
  for (const token of tokens) {
    for (const code of expectedProductCodesForCheckbox(excelProducts, field, token)) {
      codes.add(code);
    }
  }
  return codes;
}

/**
 * Verify each API product in Excel catalog satisfies active filters.
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

function assertProductsSatisfyPriceRange(apiProducts, min, max, excelByCode) {
  for (const product of apiProducts) {
    const code = String(product.product_code ?? '').trim();
    if (!excelByCode.has(code)) continue;
    const price = normalizeNumericValue(product.product_price);
    expect(price, `${code} price`).to.be.at.least(min);
    expect(price, `${code} price`).to.be.at.most(max);
  }
}

/**
 * Excel fixture is often a subset of the live DB.
 */
function compareProductCodeSets(expected, actual, ctx) {
  const missing = [...expected].filter((c) => !actual.has(c));
  const extra = [...actual].filter((c) => !expected.has(c));

  const label =
    ctx.label ||
    `[${ctx.field}${ctx.value != null ? `=${ctx.value}` : ''}] expected=${ctx.expectedCount} actual=${ctx.actualCount}`;

  expect(ctx.actualCount, `${label} — API returned fewer than Excel expects`).to.be.at.least(
    ctx.expectedCount
  );

  expect(missing, `${label} — missing product_codes: ${missing.slice(0, 10).join(', ')}`).to.deep.equal(
    []
  );

  logFilterComparison({
    filters: ctx.filters || String(ctx.field || label),
    expectedCount: ctx.expectedCount,
    actualCount: ctx.actualCount,
    missing,
    extra,
    logExtras: ctx.logExtras !== false,
  });
}

/**
 * @param {{ filters: string, expectedCount: number, actualCount: number, missing: string[], extra: string[], logExtras?: boolean }} opts
 */
function logFilterComparison(opts) {
  const { filters, expectedCount, actualCount, missing, extra, logExtras = true } = opts;
  // eslint-disable-next-line no-console
  console.log(`filters=${filters}`);
  // eslint-disable-next-line no-console
  console.log(`expected=${expectedCount} | actual=${actualCount}`);
  // eslint-disable-next-line no-console
  console.log(
    `missing (${missing.length}): ${missing.length ? missing.slice(0, 15).join(', ') : '(none)'}`
  );
  if (logExtras) {
    // eslint-disable-next-line no-console
    console.log(
      `extra (${extra.length}): ${extra.length ? extra.slice(0, 15).join(', ') : '(none)'}${extra.length > 15 ? ' …' : ''}`
    );
  }
}

function formatFilterCaseLog(field, value, expectedCount, actualCount) {
  return `filter=${field} | value=${value} | expected=${expectedCount} | actual=${actualCount}`;
}

function applyUniqueValueCap(values) {
  const capRaw = process.env.QA_MAX_UNIQUE_VALUES_PER_FILTER;
  if (!capRaw) return values;
  const cap = parseInt(capRaw, 10);
  if (!Number.isFinite(cap) || cap <= 0) return values;
  return values.slice(0, cap);
}

/**
 * Shared runner for one filter scenario.
 */
async function runFilterScenario(agent, opts) {
  const {
    filterQuery,
    expectedCodes,
    filtersLabel,
    excelByCode,
    assertFn,
  } = opts;

  const body = await fetchAllProductsForFilter(agent, filterQuery);
  const apiProducts = body.products || [];
  const actualCodes = productCodesFromApi(apiProducts);
  const expectedCount = expectedCodes.size;
  const actualCount = Number(body.totalProducts) || actualCodes.size;

  compareProductCodeSets(expectedCodes, actualCodes, {
    filters: filtersLabel,
    expectedCount,
    actualCount,
    logExtras: true,
  });

  if (assertFn) await assertFn(apiProducts, excelByCode);
  return { body, actualCodes, expectedCount, actualCount };
}

module.exports = {
  API_FIELD_MAP,
  CHECKBOX_API_FIELD_NAMES,
  setHiddenProductCodes,
  getHiddenProductCodes,
  visibleProductCodesOnly,
  normalizeCheckboxValue,
  normalizeNumericValue,
  buildRangeQueryParam,
  buildApiQueryForFilter,
  buildApiQueryForRange,
  buildApiQueryForPriceRange,
  buildApiQueryMulti,
  buildProductsRequestQuery,
  fetchAllProductsForFilter,
  productCodesFromApi,
  expectedProductCodesForFilter,
  expectedProductCodesForCheckbox,
  expectedProductCodesForDimensionRange,
  expectedProductCodesForPriceRange,
  expectedProductCodesForMultiFilter,
  expectedProductCodesForCheckboxOr,
  assertProductsSatisfyFilter,
  assertProductsSatisfyPriceRange,
  compareProductCodeSets,
  logFilterComparison,
  formatFilterCaseLog,
  applyUniqueValueCap,
  runFilterScenario,
};
