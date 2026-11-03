import {
  DIMENSION_INPUT_COMMIT_MS,
  DIMENSION_INCH_EPSILON,
  inchesToFeet,
  feetToInches,
  formatFeetFromInches,
  dimensionSliderStep,
  parseDimensionInputText,
  isDimensionDraftTextAllowed,
  finalizeDimensionInputText,
  uiValueToInches,
  inchesToUiValue,
  syncDimensionBoundPair,
  enforceDimensionMinMax,
  normalizeDimensionInchPair,
  dimensionInchesNearEqual,
  dimensionInchPairsEqual,
  parseDimensionFilterInches,
  formatInchesForDisplay,
  formatDimensionRangeChipLabel,
  resolveCommittedDimensionInches,
  shouldSkipDimensionCommit,
} from './dimensionUnits';

describe('dimensionUnits — feet ↔ inches conversion', () => {
  it('converts 7.5 ft to 90 in and back without rounding', () => {
    expect(feetToInches(7.5)).toBe(90);
    expect(inchesToFeet(90)).toBe(7.5);
    expect(formatFeetFromInches(90)).toBe('7.5');
  });

  it('converts 7.25 ft to 87 in exactly (internal); auto display is 1 dp', () => {
    expect(feetToInches(7.25)).toBe(87);
    expect(inchesToFeet(87)).toBe(7.25);
    // Auto-converted display caps at 1 decimal; typed "7.25" is kept in UI draft
    expect(formatFeetFromInches(87)).toBe('7.3');
  });

  it('converts 7.1 ft to 85.2 in and back without rounding', () => {
    expect(feetToInches(7.1)).toBeCloseTo(85.2, 10);
    expect(inchesToFeet(feetToInches(7.1))).toBeCloseTo(7.1, 10);
    expect(formatFeetFromInches(feetToInches(7.1))).toBe('7.1');
    expect(uiValueToInches(7.1, 'ft')).toBeCloseTo(85.2, 10);
  });

  it('formats auto-converted feet to a maximum of 1 decimal place', () => {
    // 52 in = 4.333... ft → 4.3
    expect(formatFeetFromInches(52)).toBe('4.3');
    // 50 in = 4.166... ft → 4.2
    expect(formatFeetFromInches(50)).toBe('4.2');
    // whole feet stay without trailing .0 noise beyond toFixed(1) integer path
    expect(formatFeetFromInches(48)).toBe('4');
  });

  it('preserves typed decimal text via parse (7.25 / 7.5) for draft display', () => {
    expect(parseDimensionInputText('7.25')).toEqual({
      status: 'valid',
      value: 7.25,
      text: '7.25',
    });
    expect(parseDimensionInputText('7.5')).toEqual({
      status: 'valid',
      value: 7.5,
      text: '7.5',
    });
    // Typed text is what the UI draft keeps; inches stay exact
    expect(feetToInches(7.25)).toBe(87);
    expect(feetToInches(7.5)).toBe(90);
  });

  it('preserves exact round-trip for several decimal feet values', () => {
    for (const ft of [0.5, 1, 2.5, 6.75, 7.1, 10.125]) {
      const inches = feetToInches(ft);
      expect(inchesToFeet(inches)).toBeCloseTo(ft, 10);
      expect(uiValueToInches(ft, 'ft')).toBe(inches);
      expect(inchesToUiValue(inches, 'ft')).toBeCloseTo(ft, 10);
    }
  });

  it('leaves inches unchanged in inches mode', () => {
    expect(uiValueToInches(90, 'in')).toBe(90);
    expect(inchesToUiValue(90, 'in')).toBe(90);
  });
});

describe('dimensionUnits — slider step', () => {
  it('uses 0.01 ft step in feet mode (supports 7.1 / 7.25 / 7.5)', () => {
    expect(dimensionSliderStep('ft')).toBe(0.01);
    // 7.1, 7.25, 7.5 all land on the 0.01 grid
    for (const ft of [7.1, 7.25, 7.5]) {
      expect(Math.round(ft / 0.01) * 0.01).toBeCloseTo(ft, 10);
    }
  });

  it('keeps step 1 in inches mode', () => {
    expect(dimensionSliderStep('in')).toBe(1);
  });
});

describe('dimensionUnits — decimal typing (partial input)', () => {
  it('treats "7." / "4." as partial so the field is not reset', () => {
    expect(parseDimensionInputText('7.')).toEqual({ status: 'partial', text: '7.' });
    expect(parseDimensionInputText('4.')).toEqual({ status: 'partial', text: '4.' });
  });

  it('treats "." as partial', () => {
    expect(parseDimensionInputText('.')).toEqual({ status: 'partial', text: '.' });
  });

  it('parses complete decimals as valid', () => {
    expect(parseDimensionInputText('7.5')).toEqual({
      status: 'valid',
      value: 7.5,
      text: '7.5',
    });
    expect(parseDimensionInputText('7.25')).toEqual({
      status: 'valid',
      value: 7.25,
      text: '7.25',
    });
    expect(parseDimensionInputText('4.5')).toEqual({
      status: 'valid',
      value: 4.5,
      text: '4.5',
    });
    expect(parseDimensionInputText('7.1')).toEqual({
      status: 'valid',
      value: 7.1,
      text: '7.1',
    });
  });

  it('allows draft keystrokes for intermediate and complete decimals', () => {
    for (const text of ['', '4', '4.', '4.5', '7.25', '.']) {
      expect(isDimensionDraftTextAllowed(text)).toBe(true);
    }
    expect(isDimensionDraftTextAllowed('7a')).toBe(false);
  });

  it('finalizes trailing-dot partials on blur/Enter without changing typed draft until then', () => {
    expect(finalizeDimensionInputText('4.')).toEqual({ ok: true, value: 4 });
    expect(finalizeDimensionInputText('7.25')).toEqual({ ok: true, value: 7.25 });
    expect(finalizeDimensionInputText('4.5')).toEqual({ ok: true, value: 4.5 });
    expect(finalizeDimensionInputText('.')).toEqual({ ok: false });
    expect(finalizeDimensionInputText('')).toEqual({ ok: false });
  });

  it('uses 400ms commit debounce constant', () => {
    expect(DIMENSION_INPUT_COMMIT_MS).toBe(400);
  });

  it('rejects invalid characters', () => {
    expect(parseDimensionInputText('7a')).toEqual({ status: 'invalid' });
    expect(parseDimensionInputText('-1')).toEqual({ status: 'invalid' });
  });

  it('treats empty as empty', () => {
    expect(parseDimensionInputText('')).toEqual({ status: 'empty' });
    expect(parseDimensionInputText('  ')).toEqual({ status: 'empty' });
  });
});

describe('dimensionUnits — min/max synchronization', () => {
  it('editing min keeps max unchanged when still ordered', () => {
    expect(syncDimensionBoundPair('min', 90, 120)).toEqual([90, 120]);
  });

  it('editing max keeps min unchanged when still ordered', () => {
    expect(syncDimensionBoundPair('max', 150, 90)).toEqual([90, 150]);
  });

  it('feet edit of one bound does not alter the other inch bound', () => {
    const otherMaxIn = 144; // 12 ft
    const editedMinIn = feetToInches(7.5); // 90
    expect(syncDimensionBoundPair('min', editedMinIn, otherMaxIn)).toEqual([90, 144]);
  });

  it('editing 7.1 ft min keeps existing max inches', () => {
    const otherMaxIn = feetToInches(12);
    const editedMinIn = feetToInches(7.1);
    const [minIn, maxIn] = syncDimensionBoundPair('min', editedMinIn, otherMaxIn);
    expect(minIn).toBeCloseTo(85.2, 10);
    expect(maxIn).toBe(otherMaxIn);
  });
});

describe('dimensionUnits — active filter chip labels', () => {
  it('formats feet chips with max 1 decimal and en-dash + unit', () => {
    // 82.95996 in ≈ 6.91333 ft → 6.9; 124.35996 in ≈ 10.36333 ft → 10.4
    expect(
      formatDimensionRangeChipLabel(
        'Display Width',
        '82.95996,124.35996',
        'ft'
      )
    ).toBe('Display Width: 6.9-10.4 ft');
  });

  it('formats inches chips with clean rounded integers', () => {
    expect(
      formatDimensionRangeChipLabel(
        'Display Height',
        '82.95996,124.35996',
        'in'
      )
    ).toBe('Display Height: 83-124 in');
    expect(formatInchesForDisplay(90)).toBe('90');
    expect(formatInchesForDisplay(82.95996)).toBe('83');
  });

  it('does not alter the raw inch pair used for filtering/URL', () => {
    const raw = '82.95996,124.35996';
    formatDimensionRangeChipLabel('Display Width', raw, 'ft');
    expect(parseDimensionFilterInches(raw)).toEqual([82.95996, 124.35996]);
  });

  it('falls back when raw value is not a min,max pair', () => {
    expect(formatDimensionRangeChipLabel('Display Width', 'oops', 'ft')).toBe(
      'Display Width: oops'
    );
  });
});

describe('dimensionUnits — enforce Min <= Max on commit', () => {
  it('when Min exceeds Max, sets Max = Min', () => {
    // e.g. Min 15, Max 10 → both 15
    expect(enforceDimensionMinMax([15, 10], 'min')).toEqual([15, 15]);
    expect(syncDimensionBoundPair('min', 15, 10)).toEqual([15, 15]);
  });

  it('when Max falls below Min, sets Min = Max', () => {
    // e.g. Min 5, Max 1 → both 1
    expect(enforceDimensionMinMax([5, 1], 'max')).toEqual([1, 1]);
    expect(syncDimensionBoundPair('max', 1, 5)).toEqual([1, 1]);
  });

  it('leaves already-valid pairs unchanged', () => {
    expect(enforceDimensionMinMax([10, 20], 'min')).toEqual([10, 20]);
    expect(enforceDimensionMinMax([10, 20], 'max')).toEqual([10, 20]);
    expect(normalizeDimensionInchPair([10, 20])).toEqual([10, 20]);
  });

  it('normalizes inverted slider pairs by setting Max = Min', () => {
    expect(normalizeDimensionInchPair([15, 10])).toEqual([15, 15]);
  });

  it('works in feet-converted inches (7.5 ft min above 5 ft max)', () => {
    const minIn = feetToInches(7.5); // 90
    const maxIn = feetToInches(5); // 60
    expect(syncDimensionBoundPair('min', minIn, maxIn)).toEqual([90, 90]);
    expect(syncDimensionBoundPair('max', maxIn, minIn)).toEqual([60, 60]);
  });
});

describe('dimensionUnits — skip unchanged commits (no API)', () => {
  const rail: [number, number] = [48, 144];

  it('parses committed filter inch pairs', () => {
    expect(parseDimensionFilterInches('90,120')).toEqual([90, 120]);
    expect(parseDimensionFilterInches(undefined)).toBeNull();
    expect(parseDimensionFilterInches('')).toBeNull();
  });

  it('resolves committed inches from filter or rail fallback', () => {
    expect(resolveCommittedDimensionInches('90,120', rail)).toEqual([90, 120]);
    expect(resolveCommittedDimensionInches(undefined, rail)).toEqual(rail);
  });

  it('skips commit when candidate matches committed filter', () => {
    expect(shouldSkipDimensionCommit([90, 120], '90,120', rail)).toBe(true);
    expect(shouldSkipDimensionCommit([90, 121], '90,120', rail)).toBe(false);
  });

  it('skips commit when no filter and candidate matches rail', () => {
    expect(shouldSkipDimensionCommit([48, 144], undefined, rail)).toBe(true);
    expect(shouldSkipDimensionCommit([60, 144], undefined, rail)).toBe(false);
  });

  it('skips when feet re-entry normalizes to the same inches', () => {
    const minIn = feetToInches(7.5); // 90
    const maxIn = feetToInches(10); // 120
    expect(shouldSkipDimensionCommit([minIn, maxIn], '90,120', rail)).toBe(true);
  });

  it('does not skip when inches actually change', () => {
    expect(
      shouldSkipDimensionCommit([feetToInches(8), 120], '90,120', rail)
    ).toBe(false);
  });

  it('tolerates tiny floating-point noise', () => {
    expect(dimensionInchesNearEqual(90, 90 + DIMENSION_INCH_EPSILON / 2)).toBe(true);
    expect(dimensionInchesNearEqual(90, 90 + 0.01)).toBe(false);
    expect(
      dimensionInchPairsEqual([90, 120], [90 + 1e-9, 120 - 1e-9])
    ).toBe(true);
  });

  it('skips duplicate apply when live pair already matches (URL pending)', () => {
    expect(
      shouldSkipDimensionCommit([90, 120], undefined, rail, [90, 120])
    ).toBe(true);
    // Live differs and no committed filter → do not skip (real change vs rail)
    expect(
      shouldSkipDimensionCommit([90, 120], undefined, rail, [48, 144])
    ).toBe(false);
  });
});
