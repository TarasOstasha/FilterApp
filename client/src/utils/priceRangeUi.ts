/**
 * Product Price slider display + stale-response helpers (display/state only).
 */

export function parseSelectedPricePair(
  raw: string | undefined | null
): [number, number] | null {
  if (raw == null || raw === '') return null;
  const [min, max] = String(raw).split(',').map(Number);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return [min, max];
}

/**
 * When true, slider uses API priceMin/priceMax (from /products/price-range)
 * instead of the full static breakpoint span ($0–$100,000).
 * Category alone counts — same as search / non-price filters.
 */
export function hasScopedPriceRails(options: {
  hasNonPriceFilters: boolean;
  searchTerms?: string;
  categoryId?: string | null;
}): boolean {
  return (
    options.hasNonPriceFilters ||
    (options.searchTerms || '').trim().length > 0 ||
    Boolean((options.categoryId || '').toString().trim())
  );
}

/**
 * Raw rail ends before breakpoint snap — mirrors FilterSidebar Product Price branch.
 */
export function resolvePriceRawRail(options: {
  scoped: boolean;
  priceMin: number;
  priceMax: number;
  priceBpFirst: number;
  priceBpLast: number;
}): { rawRailMin: number; rawRailMax: number } {
  const { scoped, priceMin, priceMax, priceBpFirst, priceBpLast } = options;
  const hasRealRange =
    priceMax >= priceMin && (priceMax > 0 || priceMin > 0 || scoped);
  return {
    rawRailMin: scoped ? (hasRealRange ? priceMin : priceBpFirst) : priceBpFirst,
    rawRailMax: scoped ? (hasRealRange ? priceMax : priceBpLast) : priceBpLast,
  };
}

/**
 * Effective Min/Max shown on the price slider and inputs.
 * - Live draft (typing/dragging) wins when present.
 * - Else selected Product Price filter values.
 * - Else dynamic rail (API search/filter/category bounds) — never the static full breakpoint span.
 */
export function resolvePriceDisplayBounds(options: {
  railMin: number;
  railMax: number;
  selectedRaw?: string | null;
  liveDraft?: [number, number] | null;
}): { min: number; max: number; source: 'draft' | 'selected' | 'rail' } {
  const { railMin, railMax, selectedRaw, liveDraft } = options;
  if (liveDraft && liveDraft.length === 2) {
    const [a, b] = liveDraft;
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return { min: a, max: b, source: 'draft' };
    }
  }
  const selected = parseSelectedPricePair(selectedRaw);
  if (selected) {
    return { min: selected[0], max: selected[1], source: 'selected' };
  }
  return { min: railMin, max: railMax, source: 'rail' };
}

/** True when this response should apply (matches latest request generation). */
export function shouldApplyPriceRangeResponse(
  responseSeq: number,
  latestSeq: number
): boolean {
  return responseSeq === latestSeq;
}
