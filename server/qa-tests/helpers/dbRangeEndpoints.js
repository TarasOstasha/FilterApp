const { Sequelize, QueryTypes } = require('sequelize');
const config = require('../../config/config.js')[process.env.NODE_ENV || 'test'];
const {
  META_QUERY_KEYS,
  parseCheckboxFilterValues,
  appendCheckboxFilterJoins,
  parseProductPriceRange,
} = require('../../utils/filterQuery');
const { visibleProductSql } = require('../../utils/productVisibility');
const {
  parsePriceBreakpoints,
  snapMinToBreakpoint,
  snapMaxToBreakpoint,
} = require('../../utils/priceBreakpoints');

/** @type {Promise<object[]>|null} */
let filterFieldsPromise = null;

function createSequelize() {
  return new Sequelize(config.database, config.username, config.password, config);
}

async function loadAllFilterFields() {
  if (!filterFieldsPromise) {
    filterFieldsPromise = (async () => {
      const sequelize = createSequelize();
      try {
        return await sequelize.query(
          `
          SELECT id, field_name, field_type, allowed_values
          FROM filter_fields
          ORDER BY sort_order ASC, id ASC
          `,
          { type: QueryTypes.SELECT }
        );
      } finally {
        await sequelize.close();
      }
    })();
  }
  return filterFieldsPromise;
}

/**
 * Build JOIN/WHERE fragments matching getPriceRange / getWidthRange / getHeightRange.
 * @param {Record<string, unknown>} query full API query (may include catId)
 * @param {{ skipRangeField?: string, applyProductPriceFilter?: boolean }} options
 */
function buildRangeEndpointJoins(query, options = {}) {
  const { skipRangeField = null, applyProductPriceFilter = false } = options;
  const catId = query.catId || null;

  let joins = '';
  let productPriceCondition = '';
  const replacements = {};
  let checkIdx = 0;
  let rangeIdx = 0;

  if (catId) {
    joins += `
        JOIN product_categories pc
          ON pc.product_id = p.id
         AND pc.category_id = :catId
      `;
    replacements.catId = catId;
  }

  return {
    applyProductPriceFromQuery(allFilterFields) {
      const map = {};
      for (const f of allFilterFields) {
        map[f.field_name] = {
          id: f.id,
          type: f.field_type,
          allowed_values: f.allowed_values,
        };
      }

      if (applyProductPriceFilter && query['Product Price']) {
        const priceField = allFilterFields.find((f) => f.field_name === 'Product Price');
        const priceBreakpoints = parsePriceBreakpoints(priceField?.allowed_values);
        const parsed = parseProductPriceRange(query['Product Price']);
        if (parsed) {
          let minPrice;
          let maxPrice;
          if (priceBreakpoints.length) {
            minPrice =
              priceBreakpoints.find((v) => v >= parsed.minPrice) ?? priceBreakpoints[0];
            maxPrice =
              [...priceBreakpoints].reverse().find((v) => v <= parsed.maxPrice) ??
              priceBreakpoints[priceBreakpoints.length - 1];
          } else {
            minPrice = parsed.minPrice;
            maxPrice = parsed.maxPrice;
          }
          replacements.minPrice = minPrice;
          replacements.maxPrice = maxPrice;
          productPriceCondition = `WHERE p.product_price BETWEEN :minPrice AND :maxPrice`;
        }
      }

      for (const fieldName of Object.keys(query)) {
        if (fieldName === 'Product Price' || META_QUERY_KEYS.has(fieldName)) continue;
        if (skipRangeField && fieldName === skipRangeField) continue;

        const rawVal = query[fieldName];
        const field = map[fieldName];
        if (!field || !rawVal) continue;

        if (field.type === 'range') {
          const [min, max] = String(rawVal).split(',').map((v) => parseFloat(v) || 0);
          replacements[`min${rangeIdx}`] = min;
          replacements[`max${rangeIdx}`] = max;
          joins += `
          JOIN product_filters pf_range${rangeIdx}
            ON pf_range${rangeIdx}.product_id = p.id
           AND pf_range${rangeIdx}.filter_field_id = ${field.id}
           AND CAST(
             regexp_replace(pf_range${rangeIdx}.filter_value, '[^0-9\\.]', '', 'g') AS double precision
           ) BETWEEN :min${rangeIdx} AND :max${rangeIdx}
        `;
          rangeIdx += 1;
        } else {
          const values = parseCheckboxFilterValues(rawVal);
          if (!values.length) continue;
          const appended = appendCheckboxFilterJoins(
            joins,
            replacements,
            field.id,
            values,
            checkIdx
          );
          joins = appended.joinClauses;
          checkIdx = appended.joinIndex;
        }
      }

      return { joins, replacements, productPriceCondition };
    },
  };
}

/**
 * @param {string|number|null} categoryId
 * @param {Record<string, string|string[]>} filterQuery
 */
async function expectedPriceRangeLikeApi(categoryId, filterQuery = {}) {
  const allFilterFields = await loadAllFilterFields();
  const priceField = allFilterFields.find((f) => f.field_name === 'Product Price');
  const priceBreakpoints = parsePriceBreakpoints(priceField?.allowed_values);

  const query = { ...filterQuery };
  if (categoryId != null) query.catId = String(categoryId);

  const builder = buildRangeEndpointJoins(query, { applyProductPriceFilter: true });
  const { joins, replacements, productPriceCondition } = builder.applyProductPriceFromQuery(
    allFilterFields
  );

  const visibilityCondition = `WHERE ${visibleProductSql('p')}`;
  const filteredProductsWhere = productPriceCondition
    ? `${productPriceCondition} AND ${visibleProductSql('p')}`
    : visibilityCondition;

  const sequelize = createSequelize();
  try {
    const [filteredRow] = await sequelize.query(
      `
      WITH filtered_products AS (
        SELECT DISTINCT p.id, p.product_price
        FROM products p
        ${joins}
        ${filteredProductsWhere}
      )
      SELECT
        MIN(product_price)::numeric AS min,
        MAX(product_price)::numeric AS max
      FROM filtered_products;
      `,
      { replacements, type: QueryTypes.SELECT }
    );

    const [globalRow] = await sequelize.query(
      `
      SELECT MIN(product_price)::numeric AS globalmin, MAX(product_price)::numeric AS globalmax
      FROM products p
      WHERE ${visibleProductSql('p')};
      `,
      { type: QueryTypes.SELECT }
    );

    let min = parseFloat(filteredRow?.min) || 0;
    let max = parseFloat(filteredRow?.max) || 0;

    if (Object.keys(replacements).length === 0) {
      min = parseFloat(globalRow?.globalmin) || 0;
      max = parseFloat(globalRow?.globalmax) || 0;
    }

    return {
      min: snapMinToBreakpoint(priceBreakpoints, min),
      max: snapMaxToBreakpoint(priceBreakpoints, max),
      breakpoints: priceBreakpoints || [],
    };
  } finally {
    await sequelize.close();
  }
}

/**
 * @param {string} fieldName 'Display Width' | 'Display Height'
 * @param {string|number|null} categoryId
 * @param {Record<string, string|string[]>} filterQuery
 */
async function expectedDimensionRangeLikeApi(fieldName, categoryId, filterQuery = {}) {
  const allFilterFields = await loadAllFilterFields();
  const dimensionField = allFilterFields.find((f) => f.field_name === fieldName);
  if (!dimensionField) {
    throw new Error(`${fieldName} filter field not found`);
  }

  const query = { ...filterQuery };
  if (categoryId != null) query.catId = String(categoryId);

  const builder = buildRangeEndpointJoins(query, { skipRangeField: fieldName });
  const { joins, replacements } = builder.applyProductPriceFromQuery(allFilterFields);

  const sequelize = createSequelize();
  try {
    const [filteredRow] = await sequelize.query(
      `
      WITH filtered_products AS (
        SELECT DISTINCT p.id
        FROM products p
        ${joins}
        WHERE ${visibleProductSql('p')}
      )
      SELECT
        MIN(CAST(regexp_replace(pf.filter_value, '[^0-9\\.]', '', 'g') AS double precision)) AS min,
        MAX(CAST(regexp_replace(pf.filter_value, '[^0-9\\.]', '', 'g') AS double precision)) AS max
      FROM product_filters pf
      JOIN filtered_products fp ON pf.product_id = fp.id
      WHERE pf.filter_field_id = ${dimensionField.id};
      `,
      { replacements, type: QueryTypes.SELECT }
    );

    const [globalRow] = await sequelize.query(
      `
      SELECT
        MIN(CAST(regexp_replace(pf.filter_value, '[^0-9\\.]+', '', 'g') AS double precision)) AS min,
        MAX(CAST(regexp_replace(pf.filter_value, '[^0-9\\.]+', '', 'g') AS double precision)) AS max
      FROM product_filters pf
      JOIN products p ON p.id = pf.product_id
      WHERE pf.filter_field_id = :fieldId
        AND ${visibleProductSql('p')}
      `,
      {
        replacements: { fieldId: dimensionField.id },
        type: QueryTypes.SELECT,
      }
    );

    return {
      min: parseFloat(filteredRow?.min) || 0,
      max: parseFloat(filteredRow?.max) || 0,
      globalMin: parseFloat(globalRow?.min) || 0,
      globalMax: parseFloat(globalRow?.max) || 0,
    };
  } finally {
    await sequelize.close();
  }
}

async function expectedWidthRangeLikeApi(categoryId, filterQuery = {}) {
  return expectedDimensionRangeLikeApi('Display Width', categoryId, filterQuery);
}

async function expectedHeightRangeLikeApi(categoryId, filterQuery = {}) {
  return expectedDimensionRangeLikeApi('Display Height', categoryId, filterQuery);
}

module.exports = {
  expectedPriceRangeLikeApi,
  expectedWidthRangeLikeApi,
  expectedHeightRangeLikeApi,
};
