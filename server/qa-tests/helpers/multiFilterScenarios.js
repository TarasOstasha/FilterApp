const {
  uniqueReasonableDimensionValues,
  selectRepresentativeNumericValues,
} = require('./sampleValueSelector');

/**
 * Build up to maxScenarios multi-filter test cases from Excel data.
 * @param {object[]} excelProducts
 * @param {Record<string, string[]>} uniqueAtomicByField
 * @param {number} [maxScenarios]
 */
function buildMultiFilterScenarios(excelProducts, uniqueAtomicByField, maxScenarios = 28) {
  const productTypes = (uniqueAtomicByField.Product_Type || []).slice(0, 4);
  const backlits = uniqueAtomicByField.Backlit || [];
  const boothSizes = (uniqueAtomicByField.Booth_Size || []).slice(0, 3);
  const widths = selectRepresentativeNumericValues(
    uniqueReasonableDimensionValues(excelProducts, 'Display_Width'),
    3
  );

  /** @type {Array<{ label: string, specs: object, kind: 'and'|'api-and-same-field'|'or-excel' }>} */
  const scenarios = [];

  const ptPair = productTypes.filter((t) =>
    ['Banner Stand', 'Retractable', 'Backdrop', 'Counter'].includes(t)
  );
  if (ptPair.length >= 2) {
    scenarios.push({
      kind: 'api-and-same-field',
      label: `Product Type=[${ptPair[0]}, ${ptPair[1]}] (API AND: must have both tokens)`,
      specs: { Product_Type: [ptPair[0], ptPair[1]] },
    });
    scenarios.push({
      kind: 'or-excel',
      label: `Product Type=${ptPair[0]} OR ${ptPair[1]} (Excel union via separate API calls)`,
      specs: { Product_Type: [ptPair[0], ptPair[1]] },
    });
  }

  for (const pt of productTypes) {
    for (const bl of backlits) {
      scenarios.push({
        kind: 'and',
        label: `Product Type=${pt} + Backlit=${bl}`,
        specs: { Product_Type: pt, Backlit: bl },
      });
    }
  }

  for (const pt of productTypes.slice(0, 3)) {
    for (const bs of boothSizes) {
      scenarios.push({
        kind: 'and',
        label: `Product Type=${pt} + Booth Size=${bs}`,
        specs: { Product_Type: pt, Booth_Size: bs },
      });
    }
  }

  for (const pt of productTypes.slice(0, 2)) {
    for (const w of widths) {
      scenarios.push({
        kind: 'and',
        label: `Product Type=${pt} + Display Width=${w}`,
        specs: { Product_Type: pt, Display_Width: { min: w, max: w } },
      });
    }
  }

  for (const bl of backlits) {
    for (const bs of boothSizes) {
      scenarios.push({
        kind: 'and',
        label: `Backlit=${bl} + Booth Size=${bs}`,
        specs: { Backlit: bl, Booth_Size: bs },
      });
    }
  }

  if (productTypes.length >= 2 && backlits.length && boothSizes.length) {
    scenarios.push({
      kind: 'and',
      label: `Product Type=${productTypes[0]} + Backlit=${backlits[0]} + Booth Size=${boothSizes[0]}`,
      specs: {
        Product_Type: productTypes[0],
        Backlit: backlits[0],
        Booth_Size: boothSizes[0],
      },
    });
  }

  const seen = new Set();
  const unique = [];
  for (const s of scenarios) {
    if (seen.has(s.label)) continue;
    seen.add(s.label);
    unique.push(s);
    if (unique.length >= maxScenarios) break;
  }
  return unique;
}

module.exports = { buildMultiFilterScenarios };
