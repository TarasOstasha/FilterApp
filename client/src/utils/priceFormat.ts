/**
 * Display-only currency formatting for Product Price filter chips.
 * Does not alter stored "min,max" filter / URL values.
 */

/** Format a single price: $1,000 or $19.99 (hide trailing .00). */
export function formatPriceChipAmount(value: number): string {
  if (!Number.isFinite(value)) return '$0';
  const hasCents = Math.abs(value % 1) > 1e-9;
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  });
  return `$${formatted}`;
}

/**
 * Chip label for Product Price from raw "min,max" inch-style pair string.
 * Example: "100,5000" → "Product Price: $100–$5,000"
 */
export function formatProductPriceChipLabel(rawPair: string): string {
  const parts = String(rawPair).split(',');
  if (parts.length < 2) return `Product Price: ${rawPair}`;
  const min = parseFloat(parts[0]);
  const max = parseFloat(parts[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return `Product Price: ${rawPair}`;
  }
  return `Product Price: ${formatPriceChipAmount(min)}–${formatPriceChipAmount(max)}`;
}
