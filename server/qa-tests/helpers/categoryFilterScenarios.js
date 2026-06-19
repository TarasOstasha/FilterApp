const { buildMultiFilterScenarios } = require('./multiFilterScenarios');
const {
  expectedProductCodesForCategory,
  expectedProductCodesForCategoryAndFilter,
  expectedProductCodesForCategoryAndMultiFilter,
} = require('./categoryTestUtils');
const { applyUniqueValueCap } = require('./filterTestUtils');

const SPOT_CHECK_FIELDS = ['Product_Type', 'Backlit', 'Booth_Size'];

/**
 * Checkbox atomic tokens present on products in a category.
 * @param {object[]} filterProducts
 * @param {Set<string>} categoryCodes
 * @param {string} field
 */
function checkboxTokensInCategory(filterProducts, categoryCodes, field) {
  const tokens = new Set();
  for (const row of filterProducts) {
    if (!categoryCodes.has(row.product_code)) continue;
    for (const token of row[`${field}_tokens`] || []) tokens.add(token);
  }
  return [...tokens].sort((a, b) => a.localeCompare(b));
}

/**
 * Build category + filter test scenarios (single checkbox + multi-filter AND).
 * Skips combos with zero visible products in the category.
 *
 * @param {object[]} filterProducts
 * @param {object[]} categoryProducts
 * @param {Record<string, string[]>} uniqueAtomicByField
 * @param {string[]} categoryIds
 * @param {{ maxScenarios?: number, excludedFields?: Set<string>, maxTokensPerField?: number }} [options]
 */
function buildCategoryFilterScenarios(
  filterProducts,
  categoryProducts,
  uniqueAtomicByField,
  categoryIds,
  options = {}
) {
  const {
    maxScenarios = parseInt(process.env.QA_MAX_CATEGORY_FILTER_SCENARIOS || '50', 10),
    excludedFields = new Set(),
    maxTokensPerField = 2,
  } = options;

  /** @type {Array<{ categoryId: string, kind: 'single'|'multi', label: string, specs: object }>} */
  const scenarios = [];
  const seen = new Set();

  const pushScenario = (scenario) => {
    if (seen.has(scenario.label)) return;
    seen.add(scenario.label);
    scenarios.push(scenario);
  };

  for (const categoryId of categoryIds) {
    const categoryCodes = expectedProductCodesForCategory(categoryProducts, categoryId);

    for (const field of SPOT_CHECK_FIELDS) {
      if (excludedFields.has(field)) continue;

      const tokens = applyUniqueValueCap(
        checkboxTokensInCategory(filterProducts, categoryCodes, field)
      ).slice(0, maxTokensPerField);

      for (const token of tokens) {
        const expected = expectedProductCodesForCategoryAndFilter(
          filterProducts,
          categoryProducts,
          categoryId,
          field,
          token
        );
        if (!expected.size) continue;

        pushScenario({
          categoryId,
          kind: 'single',
          label: `catId=${categoryId} | ${field}=${token}`,
          specs: { [field]: token },
        });
        if (scenarios.length >= maxScenarios) return scenarios;
      }
    }
  }

  const multiTemplates = buildMultiFilterScenarios(
    filterProducts,
    uniqueAtomicByField,
    28,
    excludedFields
  );

  for (const categoryId of categoryIds) {
    for (const template of multiTemplates) {
      if (template.kind === 'or-excel') continue;

      const expected = expectedProductCodesForCategoryAndMultiFilter(
        filterProducts,
        categoryProducts,
        categoryId,
        template.specs
      );
      if (!expected.size) continue;

      pushScenario({
        categoryId,
        kind: 'multi',
        label: `catId=${categoryId} | ${template.label}`,
        specs: template.specs,
      });
      if (scenarios.length >= maxScenarios) return scenarios;
    }
  }

  return scenarios;
}

module.exports = {
  SPOT_CHECK_FIELDS,
  buildCategoryFilterScenarios,
};
