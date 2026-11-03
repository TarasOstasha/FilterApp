import {
  URL_META_KEYS,
  SEARCH_COMMIT_DEBOUNCE_MS,
  parseFiltersFromSearch,
  buildProductQueryParams,
  withSearchTermsParam,
  mergeSelectedCheckboxFacets,
  buildClearAllQueryParams,
  buildDynamicFacetParams,
  SidebarFilterField,
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

  it('merges selected checkbox values missing from dynamic facets', () => {
    const fields: SidebarFilterField[] = [
      {
        id: 1,
        field_name: 'Product Type',
        field_type: 'checkbox',
        allowed_values: ['Backdrop'],
        sort_order: 0,
      },
    ];
    const merged = mergeSelectedCheckboxFacets(fields, {
      'Product Type': ['Backdrop', 'Orphan Type'],
    });
    expect(merged[0].allowed_values).toEqual(['Backdrop', 'Orphan Type']);
  });

  it('Clear All drops searchTerms and filters (page 1)', () => {
    const cleared = buildClearAllQueryParams({ limit: 27, sortBy: 'most_popular' });
    expect(cleared.has('searchTerms')).toBe(false);
    expect(cleared.get('offset')).toBe('0');
    expect(cleared.get('limit')).toBe('27');
    expect(cleared.get('sortBy')).toBe('most_popular');
    expect(cleared.has('Product Type')).toBe(false);
    expect(cleared.has('Product Price')).toBe(false);

    const parsed = parseFiltersFromSearch(`?${cleared.toString()}`);
    expect(parsed.searchTerms).toBe('');
    expect(parsed.filters).toEqual({});
    expect(parsed.offset).toBe(0);
  });

  it('clearing search only keeps other filters in URL parse', () => {
    const qp = buildProductQueryParams({
      limit: 27,
      offset: 0,
      sortBy: 'most_popular',
      filters: { 'Product Type': ['Backdrop'], 'Product Price': ['0,50'] },
      searchTerms: '',
    });
    expect(qp.has('searchTerms')).toBe(false);
    expect(qp.getAll('Product Type')).toEqual(['Backdrop']);
    expect(qp.get('Product Price')).toBe('0,50');
  });

  it('dynamic-filters params include Display Width/Height (same scope as /products)', () => {
    const params = buildDynamicFacetParams(
      {
        'Display Width': ['71.88,360'],
        'Display Height': ['84,96'],
        'Product Price': ['0,5000'],
      },
      'embrace'
    );
    expect(params.searchTerms).toBe('embrace');
    expect(params['Display Width']).toBe('71.88,360');
    expect(params['Display Height']).toBe('84,96');
    expect(params['Product Price']).toBe('0,5000');
  });

  it('mergeSelectedCheckboxFacets still preserves selected Product Type after dimension scope', () => {
    const fields: SidebarFilterField[] = [
      {
        id: 1,
        field_name: 'Product Type',
        field_type: 'checkbox',
        allowed_values: ['Backdrop', 'Trade Show Booth'],
        sort_order: 0,
      },
    ];
    const merged = mergeSelectedCheckboxFacets(fields, {
      'Product Type': ['Banner Stand'],
    });
    expect(merged[0].allowed_values).toEqual([
      'Backdrop',
      'Trade Show Booth',
      'Banner Stand',
    ]);
  });
});
