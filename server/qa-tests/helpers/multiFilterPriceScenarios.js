/**
 * Multi-filter checkbox combos + product price buckets (price from DB at runtime).
 * @param {Record<string, string[]>} uniqueAtomicByField
 * @param {Array<{ label: string, min: number, max: number }>} priceBuckets
 * @param {number} [maxScenarios]
 */
function buildMultiFilterPriceScenarios(
  uniqueAtomicByField,
  priceBuckets,
  maxScenarios = 24
) {
  const productTypes = (uniqueAtomicByField.Product_Type || []).slice(0, 3);
  const backlits = uniqueAtomicByField.Backlit || [];
  const boothSizes = (uniqueAtomicByField.Booth_Size || []).slice(0, 2);

  /** @type {Array<{ label: string, specs: object, price: { label: string, min: number, max: number } }>} */
  const scenarios = [];

  for (const pt of productTypes) {
    for (const bucket of priceBuckets) {
      scenarios.push({
        label: `Product Type=${pt} + Product Price=${bucket.label}`,
        specs: { Product_Type: pt },
        price: bucket,
      });
    }
  }

  for (const bl of backlits) {
    for (const bucket of priceBuckets.slice(0, 3)) {
      scenarios.push({
        label: `Backlit=${bl} + Product Price=${bucket.label}`,
        specs: { Backlit: bl },
        price: bucket,
      });
    }
  }

  for (const pt of productTypes.slice(0, 2)) {
    for (const bl of backlits) {
      for (const bucket of priceBuckets.slice(0, 2)) {
        scenarios.push({
          label: `Product Type=${pt} + Backlit=${bl} + Product Price=${bucket.label}`,
          specs: { Product_Type: pt, Backlit: bl },
          price: bucket,
        });
      }
    }
  }

  for (const pt of productTypes.slice(0, 2)) {
    for (const bs of boothSizes) {
      const midBucket =
        priceBuckets.find((b) => b.label === '1000-5000') || priceBuckets[0];
      if (!midBucket) continue;
      scenarios.push({
        label: `Product Type=${pt} + Booth Size=${bs} + Product Price=${midBucket.label}`,
        specs: { Product_Type: pt, Booth_Size: bs },
        price: midBucket,
      });
    }
  }

  const seen = new Set();
  const unique = [];
  for (const scenario of scenarios) {
    if (seen.has(scenario.label)) continue;
    seen.add(scenario.label);
    unique.push(scenario);
    if (unique.length >= maxScenarios) break;
  }

  return unique;
}

module.exports = { buildMultiFilterPriceScenarios };
