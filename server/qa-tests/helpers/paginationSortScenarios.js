const { buildCategoryFilterScenarios } = require('./categoryFilterScenarios');
const { buildApiQueryForFilter, buildApiQueryMulti } = require('./filterTestUtils');
const { expectedProductCodesForCategory, expectedProductCodesForCategoryAndMultiFilter } = require('./categoryTestUtils');

const DEFAULT_MIN_PRODUCTS = parseInt(process.env.QA_MIN_PRODUCTS_FOR_PAGINATION || '30', 10);

/**
 * @param {string[]} categoryIds
 * @param {object[]} filterProducts
 * @param {object[]} categoryProducts
 * @param {Record<string, string[]>} uniqueAtomicByField
 * @param {Set<string>} excludedFields
 * @param {number} [maxScenarios]
 */
function buildPaginationSortScenarios(
  categoryIds,
  filterProducts,
  categoryProducts,
  uniqueAtomicByField,
  excludedFields,
  maxScenarios
) {
  const cap = maxScenarios ?? parseInt(process.env.QA_MAX_PAGINATION_SCENARIOS || '12', 10);
  const minProducts = DEFAULT_MIN_PRODUCTS;

  /** @type {Array<{ label: string, categoryId: string|null, filterQuery: object, kind: string }>} */
  const scenarios = [];

  const push = (scenario) => {
    if (scenarios.length >= cap) return true;
    scenarios.push(scenario);
    return scenarios.length >= cap;
  };

  push({
    kind: 'global',
    label: 'global catalog (no catId)',
    categoryId: null,
    filterQuery: {},
  });

  for (const categoryId of categoryIds) {
    const count = expectedProductCodesForCategory(categoryProducts, categoryId).size;
    if (count < minProducts) continue;
    if (
      push({
        kind: 'category',
        label: `catId=${categoryId} (${count} products)`,
        categoryId,
        filterQuery: {},
      })
    ) {
      return scenarios;
    }
  }

  const filterScenarios = buildCategoryFilterScenarios(
    filterProducts,
    categoryProducts,
    uniqueAtomicByField,
    categoryIds,
    { excludedFields, maxTokensPerField: 1 }
  );

  for (const s of filterScenarios) {
    const count = expectedProductCodesForCategoryAndMultiFilter(
      filterProducts,
      categoryProducts,
      s.categoryId,
      s.specs
    ).size;
    if (count < minProducts) continue;

    const filterQuery =
      s.kind === 'single'
        ? buildApiQueryForFilter(Object.keys(s.specs)[0], s.specs[Object.keys(s.specs)[0]])
        : buildApiQueryMulti(s.specs);

    if (
      push({
        kind: 'filter',
        label: s.label,
        categoryId: s.categoryId,
        filterQuery,
      })
    ) {
      return scenarios;
    }
  }

  return scenarios;
}

module.exports = {
  buildPaginationSortScenarios,
};
