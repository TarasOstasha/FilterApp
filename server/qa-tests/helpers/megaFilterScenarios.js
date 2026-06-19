const { expectedProductCodesForCategory } = require('./categoryTestUtils');

/**
 * @param {object[]} filterProducts
 * @param {object[]} categoryProducts
 * @param {string[]} categoryIds
 * @param {number} [maxScenarios]
 */
function buildMegaFilterCodeScenarios(filterProducts, categoryProducts, categoryIds, maxScenarios) {
  const cap = maxScenarios ?? parseInt(process.env.QA_MAX_MEGA_SCENARIOS || '10', 10);
  const minCategoryProducts = parseInt(process.env.QA_MIN_PRODUCTS_FOR_MEGA || '5', 10);

  /** @type {Array<{ kind: string, label: string, categoryId: string|null, searchTerms: string }>} */
  const scenarios = [];

  const push = (scenario) => {
    if (scenarios.length >= cap) return true;
    scenarios.push(scenario);
    return scenarios.length >= cap;
  };

  const globalProduct = filterProducts.find((p) => p.product_code?.trim());
  if (globalProduct) {
    push({
      kind: 'global-code',
      label: `global | code=${globalProduct.product_code}`,
      categoryId: null,
      searchTerms: globalProduct.product_code,
    });
  }

  const prefixCounts = new Map();
  for (const p of filterProducts) {
    const code = String(p.product_code ?? '').trim();
    if (code.length < 2) continue;
    const prefix = code.slice(0, 2).toUpperCase();
    prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
  }

  const globalPrefix = [...prefixCounts.entries()]
    .filter(([, count]) => count >= minCategoryProducts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  if (globalPrefix && !scenarios.some((s) => s.searchTerms === globalPrefix)) {
    push({
      kind: 'global-prefix',
      label: `global | prefix=${globalPrefix}`,
      categoryId: null,
      searchTerms: globalPrefix,
    });
  }

  for (const categoryId of categoryIds) {
    const codes = expectedProductCodesForCategory(categoryProducts, categoryId);
    if (codes.size < minCategoryProducts) continue;

    const product = filterProducts.find((p) => codes.has(p.product_code));
    if (!product) continue;

    if (
      push({
        kind: 'category-code',
        label: `catId=${categoryId} | code=${product.product_code}`,
        categoryId,
        searchTerms: product.product_code,
      })
    ) {
      return scenarios;
    }
  }

  return scenarios;
}

module.exports = {
  buildMegaFilterCodeScenarios,
};
