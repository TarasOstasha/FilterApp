import {
  formatPriceChipAmount,
  formatProductPriceChipLabel,
} from './priceFormat';

describe('priceFormat — Product Price chip labels', () => {
  it('formats range with $ and en dash and thousands separators', () => {
    expect(formatProductPriceChipLabel('100,5000')).toBe(
      'Product Price: $100–$5,000'
    );
  });

  it('hides .00 but preserves meaningful cents', () => {
    expect(formatPriceChipAmount(100)).toBe('$100');
    expect(formatPriceChipAmount(19.99)).toBe('$19.99');
    expect(formatProductPriceChipLabel('19.99,100.5')).toBe(
      'Product Price: $19.99–$100.50'
    );
  });

  it('does not alter the raw filter pair (display-only)', () => {
    const raw = '100,5000';
    formatProductPriceChipLabel(raw);
    expect(raw).toBe('100,5000');
  });

  it('falls back for malformed values', () => {
    expect(formatProductPriceChipLabel('oops')).toBe('Product Price: oops');
  });
});
