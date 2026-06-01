export const URL_META_KEYS = new Set(['limit', 'offset', 'sortBy', 'catId']);

export interface SidebarFilterField {
  id: number;
  field_name: string;
  field_type: 'checkbox' | 'range';
  allowed_values: unknown;
  sort_order: number;
}

/** Sort by sort_order and reassign 0..n-1 so sidebar order stays stable when filtering. */
export function normalizeFilterFieldsOrder<T extends SidebarFilterField>(
  fields: T[]
): T[] {
  return [...fields]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((f, i) => ({ ...f, sort_order: i }));
}
export const RANGE_FILTER_KEYS = ['Product Price', 'Display Width', 'Display Height'];

/** Append each selected value as its own query param (commas stay inside one value). */
export function appendFilterValues(
  params: URLSearchParams,
  key: string,
  values: string[]
): void {
  values.forEach((v) => params.append(key, v));
}

/** Build axios/query object: checkbox fields as string[], range fields as single "min,max" string. */
export function filtersToQueryParams(
  filters: Record<string, string[] | undefined>
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, values] of Object.entries(filters)) {
    if (!values?.length) continue;
    if (RANGE_FILTER_KEYS.includes(key)) {
      out[key] = values[0];
    } else {
      out[key] = values;
    }
  }
  return out;
}

/** Parse filter fields from location.search — never split checkbox values on commas. */
export function parseFiltersFromSearch(search: string): {
  limit: number;
  offset: number;
  sortBy: string;
  filters: Record<string, string[]>;
} {
  const sp = new URLSearchParams(search);

  const urlLimit = Number(sp.get('limit'));
  const urlOffset = Number(sp.get('offset'));
  const limit = Number.isFinite(urlLimit) && urlLimit > 0 ? urlLimit : 27;
  const offset = Number.isFinite(urlOffset) && urlOffset >= 0 ? urlOffset : 0;

  const sortBy = sp.get('sortBy') || 'most_popular';

  const filters: Record<string, string[]> = {};
  for (const rawKey of Array.from(sp.keys())) {
    if (URL_META_KEYS.has(rawKey)) continue;
    const decodedKey = decodeURIComponent(rawKey).replace(/\+/g, ' ');
    const values = sp.getAll(rawKey);
    if (RANGE_FILTER_KEYS.includes(decodedKey)) {
      filters[decodedKey] = values.length ? [values[0]] : [];
    } else {
      filters[decodedKey] = values;
    }
  }

  return { limit, offset, sortBy, filters };
}

/** Build URLSearchParams for product/filter API calls from selectedFilters. */
export function buildProductQueryParams(options: {
  limit: number;
  offset: number;
  sortBy: string;
  filters: Record<string, string[]>;
}): URLSearchParams {
  const qp = new URLSearchParams();
  qp.set('limit', String(options.limit));
  qp.set('offset', String(options.offset));
  qp.set('sortBy', options.sortBy);
  Object.entries(options.filters).forEach(([key, values]) => {
    if (values?.length) appendFilterValues(qp, key, values);
  });
  return qp;
}
