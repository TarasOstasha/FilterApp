const { expect } = require('chai');
const {
  META_QUERY_KEYS,
  extractFiltersFromQuery,
  buildFilterJoins,
  parseProductPriceRange,
  parseSearchWords,
  appendSearchTermsSql,
  assertSqlReplacements,
} = require('../../utils/filterQuery');

describe('searchTerms meta parsing', function () {
  it('excludes searchTerms from filter-field extraction', function () {
    expect(META_QUERY_KEYS.has('searchTerms')).to.equal(true);
    const filters = extractFiltersFromQuery({
      searchTerms: 'banner stand',
      'Product Type': 'Retractable',
      catId: '51',
      sortBy: 'price_asc',
    });
    expect(filters).to.deep.equal({ 'Product Type': 'Retractable' });
    expect(filters).to.not.have.property('searchTerms');
  });

  it('parses multi-word search the same as mega filter', function () {
    expect(parseSearchWords('banner stand')).to.deep.equal(['banner', 'stand']);
    expect(parseSearchWords('  one   two  ')).to.deep.equal(['one', 'two']);
    expect(parseSearchWords('')).to.deep.equal([]);
    expect(parseSearchWords(null)).to.deep.equal([]);
  });

  it('appends AND ILIKE clauses for each word on name and code', function () {
    const replacements = {};
    const where = appendSearchTermsSql('', replacements, 'foo bar');
    expect(where).to.include('p.product_name ILIKE :searchWord0');
    expect(where).to.include('p.product_code ILIKE :searchWord0');
    expect(where).to.include('p.product_name ILIKE :searchWord1');
    expect(where).to.include(':searchWord0');
    expect(where).to.include(':searchWord1');
    expect(replacements.searchWord0).to.equal('%foo%');
    expect(replacements.searchWord1).to.equal('%bar%');
    expect(() =>
      assertSqlReplacements(`SELECT 1 FROM products p WHERE 1=1 ${where}`, replacements)
    ).to.not.throw();
  });

  it('is a no-op when searchTerms is empty', function () {
    const replacements = {};
    expect(appendSearchTermsSql(' AND x=1', replacements, '   ')).to.equal(' AND x=1');
    expect(replacements).to.deep.equal({});
  });
});

describe('parseProductPriceRange', function () {
  it('parses min,max pair', function () {
    expect(parseProductPriceRange('100,500')).to.deep.equal({ minPrice: 100, maxPrice: 500 });
  });

  it('single value sets both bounds (fixes missing :maxPrice)', function () {
    expect(parseProductPriceRange('500')).to.deep.equal({ minPrice: 500, maxPrice: 500 });
  });

  it('max-only with leading comma', function () {
    expect(parseProductPriceRange(',1000')).to.deep.equal({ minPrice: 0, maxPrice: 1000 });
  });

  it('min-only with trailing comma', function () {
    expect(parseProductPriceRange('500,')).to.deep.equal({ minPrice: 500, maxPrice: 0 });
  });

  it('returns null for empty input', function () {
    expect(parseProductPriceRange('')).to.equal(null);
    expect(parseProductPriceRange(null)).to.equal(null);
  });
});

describe('buildFilterJoins — Product Price', function () {
  it('always binds :minPrice and :maxPrice when SQL references them', function () {
    const built = buildFilterJoins({
      filters: { 'Product Price': '500' },
      allFilterFields: [],
      fieldIdMap: {},
    });

    expect(built.whereClauses).to.include(':maxPrice');
    expect(built.replacements).to.have.property('minPrice', 500);
    expect(built.replacements).to.have.property('maxPrice', 500);
    expect(built.replacements.maxPrice).to.not.equal(undefined);

    const sql = `SELECT 1 FROM products p WHERE 1=1 ${built.whereClauses}`;
    expect(() => assertSqlReplacements(sql, built.replacements)).to.not.throw();
  });
});

describe('assertSqlReplacements', function () {
  it('throws when a placeholder is missing', function () {
    const sql = 'SELECT 1 WHERE x BETWEEN :minPrice AND :maxPrice';
    expect(() =>
      assertSqlReplacements(sql, { minPrice: 1 })
    ).to.throw('SQL references :maxPrice but replacements.maxPrice is missing');
  });

  it('ignores PostgreSQL ::type casts', function () {
    const sql = `
      SELECT MIN(product_price)::numeric AS min, MAX(product_price)::numeric AS max
      FROM products p
      WHERE p.product_price BETWEEN :minPrice AND :maxPrice
    `;
    expect(() =>
      assertSqlReplacements(sql, { minPrice: 1, maxPrice: 2 })
    ).to.not.throw();
  });
});
