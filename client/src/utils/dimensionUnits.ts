/** Inches per foot — dimension filters store inches internally. */
export const INCHES_PER_FOOT = 12;

/** Exact feet from inches (no rounding). */
export function inchesToFeet(inches: number): number {
  return inches / INCHES_PER_FOOT;
}

/** Exact inches from feet (no rounding/truncation). */
export function feetToInches(feet: number): number {
  return feet * INCHES_PER_FOOT;
}

/**
 * Display feet derived from stored inches (auto unit conversion).
 * At most 1 decimal place (4.33333 → 4.3). Does not change stored inches.
 * User-typed feet strings are preserved separately in the UI draft state.
 */
export function formatFeetFromInches(inches: number): string {
  const ft = inchesToFeet(inches);
  if (!Number.isFinite(ft)) return '';
  const rounded = Math.round(ft * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1);
}

/** Clean inch display (matches sidebar inputs — no float artifacts). */
export function formatInchesForDisplay(inches: number): string {
  if (!Number.isFinite(inches)) return '';
  return String(Math.round(inches));
}

export type DimensionUnit = 'ft' | 'in';

/**
 * Slider step: hundredths of a foot in feet UI (supports 7.1, 7.25, 7.5),
 * 1 inch in inches UI (existing behavior).
 */
export function dimensionSliderStep(unit: 'ft' | 'in'): number {
  return unit === 'ft' ? 0.01 : 1;
}

export type DimensionInputParse =
  | { status: 'empty' }
  | { status: 'partial'; text: string }
  | { status: 'valid'; value: number; text: string }
  | { status: 'invalid' };

const DIMENSION_INPUT_RE = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * Parse dimension text input.
 * Allows intermediate values like "7." or "." without treating them as complete.
 */
export function parseDimensionInputText(text: string): DimensionInputParse {
  const trimmed = text.trim();
  if (trimmed === '') return { status: 'empty' };
  if (!DIMENSION_INPUT_RE.test(trimmed) && trimmed !== '.') {
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
export function isDimensionDraftTextAllowed(text: string): boolean {
  if (text === '') return true;
  return parseDimensionInputText(text).status !== 'invalid';
}

/**
 * Resolve text for commit (debounce / blur / Enter).
 * "4." → 4; complete decimals keep full precision (7.25).
 */
export function finalizeDimensionInputText(
  text: string
): { ok: true; value: number } | { ok: false } {
  const parsed = parseDimensionInputText(text);
  if (parsed.status === 'valid') {
    return { ok: true, value: parsed.value };
  }
  if (parsed.status === 'partial' && parsed.text !== '.' && parsed.text.endsWith('.')) {
    const value = Number(parsed.text.slice(0, -1));
    if (Number.isFinite(value) && value >= 0) return { ok: true, value };
  }
  return { ok: false };
}

/** Debounce before committing typed dimension bounds to filters (ms). */
export const DIMENSION_INPUT_COMMIT_MS = 400;

/**
 * Convert a UI-unit value to inches for filtering.
 * Feet → exact * 12; inches → as-is.
 */
export function uiValueToInches(uiValue: number, unit: 'ft' | 'in'): number {
  return unit === 'ft' ? feetToInches(uiValue) : uiValue;
}

/**
 * Convert stored inches to UI units for display/slider.
 * Feet → exact / 12 (no Math.round); inches → as-is.
 */
export function inchesToUiValue(inches: number, unit: 'ft' | 'in'): number {
  return unit === 'ft' ? inchesToFeet(inches) : inches;
}

/**
 * Enforce Min <= Max on commit.
 * - If Min exceeds Max → Max = Min
 * - If Max falls below Min → Min = Max
 */
export function enforceDimensionMinMax(
  pair: [number, number],
  edited: 'min' | 'max'
): [number, number] {
  const [min, max] = pair;
  if (min <= max) return [min, max];
  if (edited === 'min') return [min, min];
  return [max, max];
}

/**
 * Normalize an inch pair when the edited bound is unknown (e.g. slider).
 * If inverted, collapse so Max = Min (same as raising Min past Max).
 */
export function normalizeDimensionInchPair(pair: [number, number]): [number, number] {
  const [min, max] = pair;
  if (min <= max) return [min, max];
  return [min, min];
}

/**
 * When editing one bound, keep the other unchanged, then enforce Min <= Max.
 */
export function syncDimensionBoundPair(
  edited: 'min' | 'max',
  editedInches: number,
  otherBoundInches: number
): [number, number] {
  const pair: [number, number] =
    edited === 'min'
      ? [editedInches, otherBoundInches]
      : [otherBoundInches, editedInches];
  return enforceDimensionMinMax(pair, edited);
}

/** Tolerance for inch comparisons (avoids float noise without changing stored values). */
export const DIMENSION_INCH_EPSILON = 1e-6;

export function dimensionInchesNearEqual(
  a: number,
  b: number,
  eps: number = DIMENSION_INCH_EPSILON
): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= eps;
}

export function dimensionInchPairsEqual(
  a: [number, number],
  b: [number, number],
  eps: number = DIMENSION_INCH_EPSILON
): boolean {
  return dimensionInchesNearEqual(a[0], b[0], eps) && dimensionInchesNearEqual(a[1], b[1], eps);
}

/** Parse committed "min,max" inch filter string from URL/state. */
export function parseDimensionFilterInches(
  raw: string | undefined | null
): [number, number] | null {
  if (raw == null || raw === '') return null;
  const [min, max] = String(raw).split(',').map((v) => parseFloat(v));
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return [min, max];
}

/**
 * Active-filter chip label for Display Width / Height.
 * Formats stored inch "min,max" for the current UI unit; does not alter stored values.
 * Example: "Display Width: 6.9-10.4 ft"
 */
export function formatDimensionRangeChipLabel(
  fieldName: string,
  rawInchPair: string,
  unit: DimensionUnit = 'in'
): string {
  const pair = parseDimensionFilterInches(rawInchPair);
  if (!pair) return `${fieldName}: ${rawInchPair}`;
  const [minIn, maxIn] = pair;
  if (unit === 'ft') {
    return `${fieldName}: ${formatFeetFromInches(minIn)}-${formatFeetFromInches(maxIn)} ft`;
  }
  return `${fieldName}: ${formatInchesForDisplay(minIn)}-${formatInchesForDisplay(maxIn)} in`;
}

/**
 * Committed inch pair for a dimension field:
 * active filter value if set, otherwise the fallback rail (full range).
 */
export function resolveCommittedDimensionInches(
  selectedRaw: string | undefined | null,
  fallbackRail: [number, number]
): [number, number] {
  return parseDimensionFilterInches(selectedRaw) ?? fallbackRail;
}

/**
 * True when the candidate inch pair matches the committed filter/rail —
 * callers must skip state, URL, slider, and API updates.
 */
export function shouldSkipDimensionCommit(
  candidate: [number, number],
  selectedRaw: string | undefined | null,
  fallbackRail: [number, number],
  /** Optional live UI pair (debounced); skip duplicate applies while URL catches up. */
  livePair?: [number, number] | null
): boolean {
  const committed = resolveCommittedDimensionInches(selectedRaw, fallbackRail);
  if (dimensionInchPairsEqual(candidate, committed)) return true;
  if (livePair && dimensionInchPairsEqual(candidate, livePair)) return true;
  return false;
}
