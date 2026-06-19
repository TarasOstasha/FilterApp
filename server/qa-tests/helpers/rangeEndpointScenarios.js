const { buildCategoryFilterScenarios } = require('./categoryFilterScenarios');
const { buildApiQueryForFilter, buildApiQueryMulti } = require('./filterTestUtils');

/**
 * @param {string[]} categoryIds
 * @param {object[]} filterScenarios from buildCategoryFilterScenarios
 * @param {number} [maxScenarios]
 */
function buildRangeEndpointScenarios(categoryIds, filterScenarios, maxScenarios) {
  const cap = maxScenarios ?? parseInt(process.env.QA_MAX_RANGE_ENDPOINT_SCENARIOS || '35', 10);

  /** @type {Array<{ label: string, categoryId: string|null, filterQuery: object, kind: 'global'|'category'|'filter' }>} */
  const scenarios = [
    {
      kind: 'global',
      label: 'global (no catId, no filters)',
      categoryId: null,
      filterQuery: {},
    },
  ];

  for (const categoryId of categoryIds) {
    scenarios.push({
      kind: 'category',
      label: `catId=${categoryId} (no filters)`,
      categoryId,
      filterQuery: {},
    });
  }

  for (const s of filterScenarios) {
    const filterQuery =
      s.kind === 'single'
        ? buildApiQueryForFilter(Object.keys(s.specs)[0], s.specs[Object.keys(s.specs)[0]])
        : buildApiQueryMulti(s.specs);

    scenarios.push({
      kind: 'filter',
      label: `range scope: ${s.label}`,
      categoryId: s.categoryId,
      filterQuery,
      filterSpecs: s.specs,
    });
    if (scenarios.length >= cap) break;
  }

  return scenarios.slice(0, cap);
}

module.exports = {
  buildRangeEndpointScenarios,
};
