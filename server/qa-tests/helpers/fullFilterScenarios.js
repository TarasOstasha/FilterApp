const { normalizeNumericValue, expectedProductCodesForMultiFilter } = require('./filterTestUtils');
const { productHasCheckboxToken } = require('./excelProductLoader');
const { selectRepresentativeNumericValues } = require('./sampleValueSelector');
const { buildDimensionSpanBuckets } = require('./dimensionRangeTestUtils');

const PREFERRED_PRODUCT_TYPES = [
  'Backdrop',
  'Banner Stand',
  'Counter',
  'Retractable',
  'Outdoor',
  'Display',
];

/**
 * @param {object[]} excelProducts
 * @param {string} productType
 * @param {string} field
 * @returns {number[]}
 */
function dimensionValuesForProductType(excelProducts, productType, field) {
  const values = [];
  for (const row of excelProducts) {
    if (!productHasCheckboxToken(row, 'Product_Type', productType)) continue;
    const raw = row[field];
    if (raw == null || raw === '') continue;
    const n = normalizeNumericValue(raw);
    if (Number.isFinite(n) && n > 0 && n <= 500) values.push(n);
  }
  return [...new Set(values)].sort((a, b) => a - b);
}

/**
 * Checkbox + Display Width/Height + product price combos (candidates with Excel matches only).
 * @param {object[]} excelProducts
 * @param {Record<string, string[]>} uniqueAtomicByField
 * @param {Array<{ label: string, min: number, max: number }>} priceBuckets
 * @param {number} [maxScenarios]
 */
function buildFullFilterScenarios(
  excelProducts,
  uniqueAtomicByField,
  priceBuckets,
  maxScenarios = 60
) {
  const availableTypes = uniqueAtomicByField.Product_Type || [];
  const productTypes = PREFERRED_PRODUCT_TYPES.filter((t) => availableTypes.includes(t)).slice(
    0,
    3
  );
  if (!productTypes.length) {
    productTypes.push(...availableTypes.slice(0, 3));
  }

  const backlits = uniqueAtomicByField.Backlit || [];
  const boothSizes = (uniqueAtomicByField.Booth_Size || []).slice(0, 3);
  const prices = priceBuckets.filter((b) =>
    ['0-500', '500-1000', '1000-5000', '5000-10000'].includes(b.label)
  );

  /** @type {Array<{ label: string, specs: object, price: { label: string, min: number, max: number } }>} */
  const scenarios = [];
  const seen = new Set();

  const push = (scenario) => {
    if (seen.has(scenario.label) || scenarios.length >= maxScenarios) return;
    if (expectedProductCodesForMultiFilter(excelProducts, scenario.specs).size === 0) return;
    seen.add(scenario.label);
    scenarios.push(scenario);
  };

  for (const pt of productTypes) {
    const widthPoints = selectRepresentativeNumericValues(
      dimensionValuesForProductType(excelProducts, pt, 'Display_Width'),
      2
    );
    const heightPoints = selectRepresentativeNumericValues(
      dimensionValuesForProductType(excelProducts, pt, 'Display_Height'),
      2
    );

    for (const bl of backlits) {
      for (const w of widthPoints) {
        for (const price of prices) {
          push({
            label: `Product Type=${pt} + Backlit=${bl} + Display Width=${w} + Product Price=${price.label}`,
            specs: {
              Product_Type: pt,
              Backlit: bl,
              Display_Width: { min: w, max: w },
            },
            price,
          });
        }
      }

      for (const h of heightPoints) {
        for (const price of prices.slice(0, 2)) {
          push({
            label: `Product Type=${pt} + Backlit=${bl} + Display Height=${h} + Product Price=${price.label}`,
            specs: {
              Product_Type: pt,
              Backlit: bl,
              Display_Height: { min: h, max: h },
            },
            price,
          });
        }
      }
    }

    for (const bs of boothSizes) {
      const widthSpan =
        buildDimensionSpanBuckets(
          excelProducts.filter((r) => productHasCheckboxToken(r, 'Product_Type', pt)),
          'Display_Width'
        )[0] || buildDimensionSpanBuckets(excelProducts, 'Display_Width')[0];
      const heightSpan =
        buildDimensionSpanBuckets(
          excelProducts.filter((r) => productHasCheckboxToken(r, 'Product_Type', pt)),
          'Display_Height'
        )[0] || buildDimensionSpanBuckets(excelProducts, 'Display_Height')[0];
      const midPrice = prices.find((b) => b.label === '1000-5000') || prices[0];
      if (!midPrice) continue;

      if (widthSpan) {
        push({
          label: `Product Type=${pt} + Booth Size=${bs} + Display Width=${widthSpan.label} + Product Price=${midPrice.label}`,
          specs: {
            Product_Type: pt,
            Booth_Size: bs,
            Display_Width: { min: widthSpan.min, max: widthSpan.max },
          },
          price: midPrice,
        });
      }

      if (heightSpan) {
        push({
          label: `Product Type=${pt} + Booth Size=${bs} + Display Height=${heightSpan.label} + Product Price=${midPrice.label}`,
          specs: {
            Product_Type: pt,
            Booth_Size: bs,
            Display_Height: { min: heightSpan.min, max: heightSpan.max },
          },
          price: midPrice,
        });
      }
    }

    const w = widthPoints[0];
    const h = heightPoints[0];
    const widthSpan = buildDimensionSpanBuckets(excelProducts, 'Display_Width').find(
      (b) => b.label === '48-96'
    );
    const heightSpan = buildDimensionSpanBuckets(excelProducts, 'Display_Height').find(
      (b) => b.label === '48-96'
    );
    const midPrice = prices.find((b) => b.label === '1000-5000') || prices[0];

    if (widthSpan && heightSpan && midPrice) {
      for (const bl of backlits) {
        push({
          label: `Product Type=${pt} + Backlit=${bl} + Display Width=${widthSpan.label} + Display Height=${heightSpan.label} + Product Price=${midPrice.label}`,
          specs: {
            Product_Type: pt,
            Backlit: bl,
            Display_Width: { min: widthSpan.min, max: widthSpan.max },
            Display_Height: { min: heightSpan.min, max: heightSpan.max },
          },
          price: midPrice,
        });
      }
    }

    if (w && h && midPrice) {
      for (const bl of backlits) {
        for (const bs of boothSizes) {
          push({
            label: `Product Type=${pt} + Backlit=${bl} + Booth Size=${bs} + Display Width=${w} + Display Height=${h} + Product Price=${midPrice.label}`,
            specs: {
              Product_Type: pt,
              Backlit: bl,
              Booth_Size: bs,
              Display_Width: { min: w, max: w },
              Display_Height: { min: h, max: h },
            },
            price: midPrice,
          });
        }
      }
    }
  }

  return scenarios;
}

module.exports = { buildFullFilterScenarios };
