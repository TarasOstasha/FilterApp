import { RANGE_FILTER_KEYS, URL_META_KEYS } from './filterParams';

export interface FilterRangeRails {
  price?: { min: number; max: number; breakpoints?: number[] };
  width?: { min: number; max: number };
  height?: { min: number; max: number };
}

const EXTRA_META_KEYS = [
  'page',
  'itemsPerPage',
  'items',
  'sort',
  'order',
  'dir',
  'q',
  'query',
  'search',
  'categoryId',
];

const META_KEYS = new Set([
  ...Array.from(URL_META_KEYS),
  ...EXTRA_META_KEYS,
]);

const same = (x: number, y: number) => Math.abs(x - y) < 1e-6;

function parsePair(s?: string): [number, number] {
  if (!s) return [NaN, NaN];
  const [a, b] = s.split(',').map(Number);
  return [a, b];
}

function isDefaultRange(
  field: string,
  value: string,
  rails: FilterRangeRails
): boolean {
  const [mn, mx] = parsePair(value);
  if (!Number.isFinite(mn) || !Number.isFinite(mx)) return true;

  if (field === 'Product Price' && rails.price) {
    const bps = rails.price.breakpoints;
    const bpFirst = bps?.[0] ?? rails.price.min;
    const bpLast = bps?.[bps.length - 1] ?? rails.price.max;
    if (bpLast > bpFirst && same(mn, bpFirst) && same(mx, bpLast)) return true;
    return false;
  }

  if (field === 'Display Width' && rails.width) {
    const { min, max } = rails.width;
    if (min !== max && same(mn, min) && same(mx, max)) return true;
    return false;
  }

  if (field === 'Display Height' && rails.height) {
    const { min, max } = rails.height;
    if (min !== max && same(mn, min) && same(mx, max)) return true;
    return false;
  }

  return false;
}

function sanitizeFilterState(
  filtersState: Record<string, string[] | undefined>
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(filtersState).filter(
      ([k, v]) => !META_KEYS.has(k) && Array.isArray(v) && v.length > 0
    )
  ) as Record<string, string[]>;
}

/**
 * Returns true only when real filter values are active (checkbox selections or
 * non-default range values). Meta params (limit, offset, sortBy, catId, etc.) are ignored.
 */
export function hasActiveFilters(
  filtersState: Record<string, string[] | undefined>,
  rangeRails?: FilterRangeRails
): boolean {
  const safe = sanitizeFilterState(filtersState);

  for (const [key, values] of Object.entries(safe)) {
    if (RANGE_FILTER_KEYS.includes(key)) {
      const val = values[0];
      if (!val) continue;

      if (!rangeRails) {
        // Without rail bounds, only checkbox filters count as active
        continue;
      }

      if (!isDefaultRange(key, val, rangeRails)) return true;
    } else {
      return true;
    }
  }

  return false;
}
