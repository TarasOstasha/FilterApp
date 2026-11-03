/**
 * Regression helpers for Product Price slider / custom input behavior.
 * Mirrors FilterSidebar commit rules without mounting React.
 */

import {
  hasScopedPriceRails,
  resolvePriceDisplayBounds,
  resolvePriceRawRail,
  shouldApplyPriceRangeResponse,
} from './priceRangeUi';

function near(x: number, y: number) {
  return Math.abs(x - y) < 1e-6;
}

/** Same skip rules as commitPriceRange — avoid API when unchanged / full rail. */
export function shouldSkipPriceCommit(
  next: [number, number],
  currentRaw: string | undefined,
  fullRail: [number, number]
): boolean {
  const [minIn, maxIn] = next;
  if (currentRaw) {
    const [curMin, curMax] = currentRaw.split(',').map(Number);
    if (near(curMin, minIn) && near(curMax, maxIn)) return true;
  } else if (near(minIn, fullRail[0]) && near(maxIn, fullRail[1])) {
    return true;
  }
  return false;
}

/** Custom inputs keep exact numbers (no breakpoint snap). */
export function customPriceInputPair(
  edited: 'min' | 'max',
  raw: number,
  other: number
): [number, number] {
  return edited === 'min' ? [raw, other] : [other, raw];
}

describe('priceRangeUi — custom inputs and commit skip', () => {
  const rail: [number, number] = [100, 5000];
  const bps = [0, 50, 100, 500, 1000, 5000, 10000];

  it('keeps exact custom min/max without snapping to breakpoints', () => {
    expect(customPriceInputPair('min', 223, 1013)).toEqual([223, 1013]);
    expect(customPriceInputPair('max', 1013, 223)).toEqual([223, 1013]);
    // Not forced onto breakpoint list
    expect(bps.includes(223)).toBe(false);
    expect(bps.includes(1013)).toBe(false);
  });

  it('skips commit when custom pair already matches filter state', () => {
    expect(shouldSkipPriceCommit([223, 1013], '223,1013', rail)).toBe(true);
  });

  it('does not skip when custom values change', () => {
    expect(shouldSkipPriceCommit([223, 2000], '223,1013', rail)).toBe(false);
  });

  it('skips commit when selecting the full rail with no prior price filter', () => {
    expect(shouldSkipPriceCommit([100, 5000], undefined, rail)).toBe(true);
  });

  it('does not reset selection just because rails match a different pair', () => {
    // Selected custom stays; rail change alone is not a commit
    expect(shouldSkipPriceCommit([223, 1013], '223,1013', [50, 10000])).toBe(true);
  });
});

describe('priceRangeUi — display bounds (search-only rails)', () => {
  const railMin = 100;
  const railMax = 5000;
  const globalFirst = 0;
  const globalLast = 100000;

  it('with no Product Price selected, shows API rail not global $0–$100,000', () => {
    const { min, max, source } = resolvePriceDisplayBounds({
      railMin,
      railMax,
      selectedRaw: undefined,
    });
    expect(source).toBe('rail');
    expect(min).toBe(100);
    expect(max).toBe(5000);
    expect(min).not.toBe(globalFirst);
    expect(max).not.toBe(globalLast);
  });

  it('with Product Price selected, shows selected values', () => {
    const { min, max, source } = resolvePriceDisplayBounds({
      railMin,
      railMax,
      selectedRaw: '223,3900',
    });
    expect(source).toBe('selected');
    expect(min).toBe(223);
    expect(max).toBe(3900);
  });

  it('live draft overrides selected and rail while editing', () => {
    const { min, max, source } = resolvePriceDisplayBounds({
      railMin,
      railMax,
      selectedRaw: '223,3900',
      liveDraft: [300, 4000],
    });
    expect(source).toBe('draft');
    expect([min, max]).toEqual([300, 4000]);
  });

  it('rejects stale price-range responses', () => {
    expect(shouldApplyPriceRangeResponse(1, 2)).toBe(false);
    expect(shouldApplyPriceRangeResponse(3, 3)).toBe(true);
  });
});

describe('priceRangeUi — category-scoped price rails', () => {
  const bpFirst = 0;
  const bpLast = 100000;
  /** Simulated /products/price-range for catId=401 (already breakpoint-snapped). */
  const apiMin = 50;
  const apiMax = 5000;

  it('category-only browsing uses API priceMin/priceMax, not $0–$100,000', () => {
    const scoped = hasScopedPriceRails({
      hasNonPriceFilters: false,
      searchTerms: '',
      categoryId: '401',
    });
    expect(scoped).toBe(true);

    const { rawRailMin, rawRailMax } = resolvePriceRawRail({
      scoped,
      priceMin: apiMin,
      priceMax: apiMax,
      priceBpFirst: bpFirst,
      priceBpLast: bpLast,
    });
    expect([rawRailMin, rawRailMax]).toEqual([apiMin, apiMax]);

    const display = resolvePriceDisplayBounds({
      railMin: rawRailMin,
      railMax: rawRailMax,
      selectedRaw: undefined,
    });
    expect(display.source).toBe('rail');
    expect(display.min).toBe(apiMin);
    expect(display.max).toBe(apiMax);
    // Rail update alone is not a Product Price commit / chip
    expect(shouldSkipPriceCommit([apiMin, apiMax], undefined, [apiMin, apiMax])).toBe(
      true
    );
  });

  it('category + search stays scoped to API rails', () => {
    const scoped = hasScopedPriceRails({
      hasNonPriceFilters: false,
      searchTerms: 'backdrop',
      categoryId: '401',
    });
    expect(scoped).toBe(true);

    const narrowedMax = 1000;
    const { rawRailMin, rawRailMax } = resolvePriceRawRail({
      scoped,
      priceMin: apiMin,
      priceMax: narrowedMax,
      priceBpFirst: bpFirst,
      priceBpLast: bpLast,
    });
    expect([rawRailMin, rawRailMax]).toEqual([apiMin, narrowedMax]);
  });

  it('Clear All within a category keeps category-scoped rails (no chip)', () => {
    // After Clear All: filters + search empty, catId preserved on URL/path.
    const scoped = hasScopedPriceRails({
      hasNonPriceFilters: false,
      searchTerms: '',
      categoryId: '401',
    });
    expect(scoped).toBe(true);

    const { rawRailMin, rawRailMax } = resolvePriceRawRail({
      scoped,
      priceMin: apiMin,
      priceMax: apiMax,
      priceBpFirst: bpFirst,
      priceBpLast: bpLast,
    });
    expect([rawRailMin, rawRailMax]).toEqual([apiMin, apiMax]);
    expect(rawRailMin).not.toBe(bpFirst);
    expect(rawRailMax).not.toBe(bpLast);
    expect(shouldSkipPriceCommit([apiMin, apiMax], undefined, [apiMin, apiMax])).toBe(
      true
    );
  });

  it('without category, search, or filters falls back to full breakpoint span', () => {
    const scoped = hasScopedPriceRails({
      hasNonPriceFilters: false,
      searchTerms: '',
      categoryId: '',
    });
    expect(scoped).toBe(false);

    const { rawRailMin, rawRailMax } = resolvePriceRawRail({
      scoped,
      priceMin: apiMin,
      priceMax: apiMax,
      priceBpFirst: bpFirst,
      priceBpLast: bpLast,
    });
    expect([rawRailMin, rawRailMax]).toEqual([bpFirst, bpLast]);
  });
});
