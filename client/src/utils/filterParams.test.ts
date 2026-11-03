import {
  URL_META_KEYS,
  SEARCH_COMMIT_DEBOUNCE_MS,
  parseFiltersFromSearch,
  buildProductQueryParams,
  withSearchTermsParam,
} from './filterParams';

describe('filterParams — searchTerms', () => {
  it('treats searchTerms as URL meta, not a sidebar filter field', () => {
    expect(URL_META_KEYS.has('searchTerms')).toBe(true);
    const parsed = parseFiltersFromSearch(
      '?searchTerms=banner+stand&Product+Type=Retractable&limit=27&offset=0&sortBy=most_popular'
    );
    expect(parsed.searchTerms).toBe('banner stand');
    expect(parsed.filters).toEqual({ 'Product Type': ['Retractable'] });
    expect(parsed.filters).not.toHaveProperty('searchTerms');
  });

  it('uses 400ms search commit debounce', () => {
    expect(SEARCH_COMMIT_DEBOUNCE_MS).toBe(400);
  });

  it('includes searchTerms in product query params when non-empty', () => {
    const qp = buildProductQueryParams({
      limit: 27,
      offset: 0,
      sortBy: 'price_asc',
      filters: { 'Product Type': ['Retractable'] },
      searchTerms: '  banner  ',
    });
    expect(qp.get('searchTerms')).toBe('banner');
    expect(qp.getAll('Product Type')).toEqual(['Retractable']);
    expect(qp.get('limit')).toBe('27');
  });

  it('omits searchTerms when empty', () => {
    const qp = buildProductQueryParams({
      limit: 27,
      offset: 0,
      sortBy: 'most_popular',
      filters: {},
      searchTerms: '   ',
    });
    expect(qp.has('searchTerms')).toBe(false);
  });

  it('merges searchTerms into sidebar/range params without mutating filters', () => {
    const base = { 'Product Type': 'Retractable' };
    expect(withSearchTermsParam(base, 'foo')).toEqual({
      'Product Type': 'Retractable',
      searchTerms: 'foo',
    });
    expect(base).toEqual({ 'Product Type': 'Retractable' });
    expect(withSearchTermsParam(base, '')).toBe(base);
  });

  it('preserves filters when clearing search from URL parse', () => {
    const withSearch = parseFiltersFromSearch(
      '?searchTerms=xyz&Brand=Acme&limit=27'
    );
    expect(withSearch.searchTerms).toBe('xyz');
    expect(withSearch.filters.Brand).toEqual(['Acme']);

    const cleared = parseFiltersFromSearch('?Brand=Acme&limit=27');
    expect(cleared.searchTerms).toBe('');
    expect(cleared.filters.Brand).toEqual(['Acme']);
  });
});
