/**
 * Parse comma-separated allowed_values into sorted numeric breakpoints.
 * @param {string | null | undefined} allowedValues
 * @returns {number[]}
 */
function parsePriceBreakpoints(allowedValues) {
  if (!allowedValues) return [];
  return allowedValues
    .split(',')
    .map((v) => parseFloat(v.trim()))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
}

/**
 * Largest predefined bucket <= actualMin (e.g. 54 -> 50, 12 -> 0).
 * @param {number[]} breakpoints
 * @param {number} actualMin
 * @returns {number}
 */
function snapMinToBreakpoint(breakpoints, actualMin) {
  if (!breakpoints.length) return parseFloat(actualMin) || 0;
  const min = parseFloat(actualMin) || 0;
  const atOrBelow = breakpoints.filter((v) => v <= min);
  return atOrBelow.length ? atOrBelow[atOrBelow.length - 1] : breakpoints[0];
}

/**
 * Smallest predefined bucket >= actualMax (e.g. 11654 -> 20000).
 * @param {number[]} breakpoints
 * @param {number} actualMax
 * @returns {number}
 */
function snapMaxToBreakpoint(breakpoints, actualMax) {
  if (!breakpoints.length) return parseFloat(actualMax) || 0;
  const max = parseFloat(actualMax) || 0;
  return breakpoints.find((v) => v >= max) ?? breakpoints[breakpoints.length - 1];
}

module.exports = {
  parsePriceBreakpoints,
  snapMinToBreakpoint,
  snapMaxToBreakpoint,
};
