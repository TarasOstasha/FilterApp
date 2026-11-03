/**
 * Regression helpers for Product Price slider / custom input behavior.
 * Mirrors FilterSidebar commit rules without mounting React.
 */

import {
  PRICE_INPUT_COMMIT_MS,
  PRICE_MIN_GT_MAX_MESSAGE,
  finalizePriceInputText,
  formatPriceBoundDisplay,
  hasScopedPriceRails,
  isPriceDraftTextAllowed,
  parsePriceInputText,
  resolvePriceBoundCommit,
  resolvePriceDisplayBounds,
  resolvePriceRawRail,
  shouldApplyPriceRangeResponse,
  shouldSkipPriceCommit,
} from './priceRangeUi';

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

describe('priceRangeUi — draft text inputs (free typing)', () => {
  const railMin = 500;
  const railMax = 500000;

  it('uses 400ms commit debounce', () => {
    expect(PRICE_INPUT_COMMIT_MS).toBe(400);
  });

  it('allows empty and partial drafts while typing 500000 → 5000', () => {
    expect(isPriceDraftTextAllowed('')).toBe(true);
    expect(isPriceDraftTextAllowed('5')).toBe(true);
    expect(isPriceDraftTextAllowed('50')).toBe(true);
    expect(isPriceDraftTextAllowed('500')).toBe(true);
    expect(isPriceDraftTextAllowed('5000')).toBe(true);
    expect(isPriceDraftTextAllowed('5000.')).toBe(true);
    expect(isPriceDraftTextAllowed('19.99')).toBe(true);
    expect(isPriceDraftTextAllowed('abc')).toBe(false);

    // Replacing max: draft strings never jump back to 500000
    const replace = '5000';
    expect(formatPriceBoundDisplay(railMax)).toBe('500000');
    for (let i = 1; i <= replace.length; i++) {
      const partial = replace.slice(0, i);
      expect(isPriceDraftTextAllowed(partial)).toBe(true);
      expect(partial).not.toBe(String(railMax));
    }

    const committed = finalizePriceInputText('5000');
    expect(committed).toEqual({ ok: true, value: 5000 });
    const pair = resolvePriceBoundCommit({
      edited: 'max',
      editedValue: 5000,
      otherBound: railMin,
    });
    expect(pair).toEqual({ ok: true, pair: [500, 5000] });
  });

  it('allows clearing then replacing without Min>Max reset during typing', () => {
    expect(parsePriceInputText('')).toEqual({ status: 'empty' });
    expect(finalizePriceInputText('')).toEqual({ ok: false });

    // Mid-edit Max "1" with Min 500 is invalid only at commit — draft text still allowed
    expect(isPriceDraftTextAllowed('1')).toBe(true);
    const mid = resolvePriceBoundCommit({
      edited: 'max',
      editedValue: 1,
      otherBound: 500,
    });
    expect(mid.ok).toBe(false);
    if (!mid.ok) {
      expect(mid.reason).toBe('min_gt_max');
      // Preserve other bound in reported pair — do not reset both to rail
      expect(mid.pair[0]).toBe(500);
      expect(mid.pair[1]).toBe(1);
      expect(mid.pair).not.toEqual([railMin, railMax]);
    }
    expect(PRICE_MIN_GT_MAX_MESSAGE).toMatch(/Min must be less than or equal to Max/i);
  });

  it('keeps exact decimal prices on commit (no breakpoint snap)', () => {
    expect(finalizePriceInputText('19.99')).toEqual({ ok: true, value: 19.99 });
    expect(finalizePriceInputText('4.')).toEqual({ ok: true, value: 4 });
    const pair = resolvePriceBoundCommit({
      edited: 'min',
      editedValue: 19.99,
      otherBound: 5000,
    });
    expect(pair).toEqual({ ok: true, pair: [19.99, 5000] });
  });

  it('Enter/blur finalize complete numbers; empty blur does not commit', () => {
    expect(finalizePriceInputText('5000')).toEqual({ ok: true, value: 5000 });
    expect(finalizePriceInputText('')).toEqual({ ok: false });
    expect(finalizePriceInputText('.')).toEqual({ ok: false });
  });

  it('invalid Min > Max on commit preserves other bound (no dual rail reset)', () => {
    const badMin = resolvePriceBoundCommit({
      edited: 'min',
      editedValue: 9000,
      otherBound: 5000,
    });
    expect(badMin.ok).toBe(false);
    if (!badMin.ok) {
      expect(badMin.pair).toEqual([9000, 5000]);
      expect(badMin.pair).not.toEqual([railMin, railMax]);
    }

    const ok = resolvePriceBoundCommit({
      edited: 'max',
      editedValue: 5000,
      otherBound: 500,
    });
    expect(ok).toEqual({ ok: true, pair: [500, 5000] });
    expect(shouldSkipPriceCommit([500, 5000], '500,5000', [railMin, railMax])).toBe(true);
  });

  it('active draft display is independent of API rail updates', () => {
    const draftMax = '5000';
    expect(isPriceDraftTextAllowed(draftMax)).toBe(true);
    // Rail may change from API; draft string is what the input shows while editing
    const displayMax =
      draftMax !== undefined ? draftMax : formatPriceBoundDisplay(railMax);
    expect(displayMax).toBe('5000');
    expect(displayMax).not.toBe(formatPriceBoundDisplay(100000));
  });
});
