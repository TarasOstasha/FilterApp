/**
 * Product Price slider display + draft-input helpers (display/state only).
 */

/** Debounce before committing typed price bounds to filters (ms). */
export const PRICE_INPUT_COMMIT_MS = 400;

export type PriceDraftKey = 'min' | 'max';

export type PriceInputParse =
  | { status: 'empty' }
  | { status: 'partial'; text: string }
  | { status: 'valid'; value: number; text: string }
  | { status: 'invalid' };

const PRICE_INPUT_RE = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * Parse price text input.
 * Allows intermediate values like "7." or "" without treating them as complete.
 */
export function parsePriceInputText(text: string): PriceInputParse {
  const trimmed = text.trim();
  if (trimmed === '') return { status: 'empty' };
  if (!PRICE_INPUT_RE.test(trimmed) && trimmed !== '.') {
    return { status: 'invalid' };
  }
  if (trimmed === '.' || trimmed.endsWith('.')) {
    return { status: 'partial', text: trimmed };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return { status: 'invalid' };
  return { status: 'valid', value, text: trimmed };
}

/** True when keystrokes should update the draft (never reformat; reject junk). */
export function isPriceDraftTextAllowed(text: string): boolean {
  if (text === '') return true;
  return parsePriceInputText(text).status !== 'invalid';
}

/**
 * Resolve text for commit (debounce / blur / Enter).
 * "4." → 4; complete decimals keep full precision (19.99).
 */
export function finalizePriceInputText(
  text: string
): { ok: true; value: number } | { ok: false } {
  const parsed = parsePriceInputText(text);
  if (parsed.status === 'valid') {
    return { ok: true, value: parsed.value };
  }
  if (parsed.status === 'partial' && parsed.text !== '.' && parsed.text.endsWith('.')) {
    const value = Number(parsed.text.slice(0, -1));
    if (Number.isFinite(value) && value >= 0) return { ok: true, value };
  }
  return { ok: false };
}

/**
 * Build commit pair for one edited bound. Validates Min <= Max only here — not while typing.
 * On invalid: preserve otherBound; caller shows validation (do not reset both to rail).
 */
export function resolvePriceBoundCommit(options: {
  edited: PriceDraftKey;
  editedValue: number;
  otherBound: number;
}):
  | { ok: true; pair: [number, number] }
  | { ok: false; reason: 'min_gt_max'; pair: [number, number] } {
  const { edited, editedValue, otherBound } = options;
  const pair: [number, number] =
    edited === 'min' ? [editedValue, otherBound] : [otherBound, editedValue];
  if (pair[0] <= pair[1]) return { ok: true, pair };
  return { ok: false, reason: 'min_gt_max', pair };
}

export const PRICE_MIN_GT_MAX_MESSAGE = 'Min must be less than or equal to Max';

/** Same skip rules as FilterSidebar commitPriceRange — avoid API when unchanged / full rail. */
export function shouldSkipPriceCommit(
  next: [number, number],
  currentRaw: string | undefined,
  fullRail: [number, number]
): boolean {
  const near = (x: number, y: number) => Math.abs(x - y) < 1e-6;
  const [minIn, maxIn] = next;
  if (currentRaw) {
    const [curMin, curMax] = currentRaw.split(',').map(Number);
    if (near(curMin, minIn) && near(curMax, maxIn)) return true;
  } else if (near(minIn, fullRail[0]) && near(maxIn, fullRail[1])) {
    return true;
  }
  return false;
}

/** Display string for a committed/rail numeric bound (no currency formatting). */
export function formatPriceBoundDisplay(value: number): string {
  if (!Number.isFinite(value)) return '';
  return String(value);
}

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
