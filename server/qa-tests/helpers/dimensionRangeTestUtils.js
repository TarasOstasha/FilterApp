const { normalizeNumericValue } = require('./filterTestUtils');
const {
  MAX_REASONABLE_DIMENSION_INCHES,
  uniqueReasonableDimensionValues,
  selectRepresentativeNumericValues,
} = require('./sampleValueSelector');

const DIMENSION_FIELDS = ['Display_Width', 'Display_Height'];

/** Inclusive inch span buckets for API range filters (product_filters.filter_value BETWEEN). */
const DIMENSION_SPAN_TEMPLATES = [
  { label: '1-24', min: 1, max: 24 },
  { label: '24-48', min: 24, max: 48 },
  { label: '48-96', min: 48, max: 96 },
  { label: '96-120', min: 96, max: 120 },
  { label: '120-500', min: 120, max: MAX_REASONABLE_DIMENSION_INCHES },
];

/**
 * @param {object[]} excelProducts
 * @param {string} field
 * @returns {number[]}
 */
function selectRepresentativeDimensionValues(excelProducts, field, targetCount = 5) {
  return selectRepresentativeNumericValues(
    uniqueReasonableDimensionValues(excelProducts, field),
    targetCount
  );
}

/**
 * @param {object[]} excelProducts
 * @param {string} field
 * @returns {Array<{ label: string, min: number, max: number }>}
 */
function buildDimensionSpanBuckets(excelProducts, field) {
  const values = uniqueReasonableDimensionValues(excelProducts, field);
  if (!values.length) return [];

  const dataMax = values[values.length - 1];

  return DIMENSION_SPAN_TEMPLATES.filter((bucket) => {
    if (bucket.min > dataMax) return false;
    return excelProducts.some((row) => {
      const raw = row[field];
      if (raw == null || raw === '') return false;
      const n = normalizeNumericValue(raw);
      return (
        Number.isFinite(n) &&
        n <= MAX_REASONABLE_DIMENSION_INCHES &&
        n >= bucket.min &&
        n <= bucket.max
      );
    });
  });
}

/**
 * @param {object[]} excelProducts
 * @param {number} [pointCountPerField]
 * @param {number} [maxSpanBucketsPerField]
 */
function buildDimensionRangeScenarios(
  excelProducts,
  pointCountPerField = 5,
  maxSpanBucketsPerField = 5
) {
  /** @type {Array<{ field: string, kind: 'point'|'span', label: string, min: number, max: number }>} */
  const scenarios = [];

  for (const field of DIMENSION_FIELDS) {
    const apiLabel = field === 'Display_Width' ? 'Display Width' : 'Display Height';

    for (const value of selectRepresentativeDimensionValues(
      excelProducts,
      field,
      pointCountPerField
    )) {
      scenarios.push({
        field,
        kind: 'point',
        label: `${apiLabel} point ${value},${value}`,
        min: value,
        max: value,
      });
    }

    for (const bucket of buildDimensionSpanBuckets(excelProducts, field).slice(
      0,
      maxSpanBucketsPerField
    )) {
      scenarios.push({
        field,
        kind: 'span',
        label: `${apiLabel} span ${bucket.label}`,
        min: bucket.min,
        max: bucket.max,
      });
    }
  }

  return scenarios;
}

module.exports = {
  DIMENSION_FIELDS,
  DIMENSION_SPAN_TEMPLATES,
  selectRepresentativeDimensionValues,
  buildDimensionSpanBuckets,
  buildDimensionRangeScenarios,
};
