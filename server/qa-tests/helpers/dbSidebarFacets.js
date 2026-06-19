const { Sequelize, QueryTypes } = require('sequelize');
const config = require('../../config/config.js')[process.env.NODE_ENV || 'test'];
const {
  extractFiltersFromQuery,
  DISTINCT_FILTER_VALUE_SQL,
  buildFilterJoins,
} = require('../../utils/filterQuery');
const { VISIBLE_PRODUCT_SQL_AND } = require('../../utils/productVisibility');
const { API_FIELD_MAP } = require('./filterTestUtils');

/** @type {Promise<Array<{ id: number, field_name: string, field_type: string, sort_order: number }>>|null} */
let filterFieldsPromise = null;

async function loadAllFilterFields() {
  if (!filterFieldsPromise) {
    filterFieldsPromise = loadFilterFieldsFromDb();
  }
  return filterFieldsPromise;
}

async function loadFilterFieldsFromDb() {
  const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );

  try {
    return await sequelize.query(
      `
      SELECT id, field_name, field_type, sort_order
      FROM filter_fields
      ORDER BY sort_order ASC, id ASC
      `,
      { type: QueryTypes.SELECT }
    );
  } finally {
    await sequelize.close();
  }
}

/**
 * Compute expected checkbox facets using the same SQL scope as filterField / dynamic-filters.
 * @param {string|number|null} categoryId
 * @param {Record<string, string|string[]>} filterQuery API query keys (field names + catId stripped)
 * @param {Set<string>} excludedCanonicalFields
 */
async function expectedCheckboxFacetsLikeApi(
  categoryId,
  filterQuery,
  excludedCanonicalFields = new Set()
) {
  const allFilterFields = await loadAllFilterFields();
  const fieldIdMap = allFilterFields.reduce((acc, field) => {
    acc[field.field_name] = field.id;
    return acc;
  }, {});

  const catId = categoryId ? Number(categoryId) : null;
  const filters = extractFiltersFromQuery(filterQuery);

  const categoryJoin = catId
    ? `
        JOIN product_categories pc
          ON pc.product_id = p.id
         AND pc.category_id = :catId
      `
    : '';

  const buildJoins = () => {
    const built = buildFilterJoins({
      filters,
      allFilterFields,
      fieldIdMap,
    });
    if (catId) built.replacements.catId = catId;
    return built;
  };

  const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );

  /** @type {Record<string, string[]>} */
  const byApiField = {};

  try {
    for (const field of allFilterFields) {
      const canonical = Object.entries(API_FIELD_MAP).find(
        ([, spec]) => spec.apiParam === field.field_name
      )?.[0];
      if (!canonical || excludedCanonicalFields.has(canonical)) continue;
      if (field.field_type !== 'checkbox') continue;

      const { joinClauses, whereClauses, replacements } = buildJoins();
      const sql = `
        WITH base_products AS (
          SELECT DISTINCT p.id
          FROM products p
          ${categoryJoin}
          ${joinClauses}
          WHERE 1=1
          ${whereClauses}
          ${VISIBLE_PRODUCT_SQL_AND}
        )
        ${DISTINCT_FILTER_VALUE_SQL}
      `;

      const fieldRepl = { ...replacements, fieldId: field.id };
      const rows = await sequelize.query(sql, {
        replacements: fieldRepl,
        type: QueryTypes.SELECT,
      });

      if (rows.length) {
        byApiField[field.field_name] = rows.map((r) => String(r.val).trim()).filter(Boolean);
      }
    }
  } finally {
    await sequelize.close();
  }

  return byApiField;
}

module.exports = {
  loadAllFilterFields,
  expectedCheckboxFacetsLikeApi,
};
