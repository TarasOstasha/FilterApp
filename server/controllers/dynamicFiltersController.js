const { sequelize, FilterField } = require('../models');
const { QueryTypes } = require('sequelize');
const chalk = require('chalk');
const {
  extractFiltersFromQuery,
  DISTINCT_FILTER_VALUE_SQL,
  buildFilterJoins,
} = require('../utils/filterQuery');
const { normalizeFilterResultsSortOrder } = require('../utils/filterFieldOrder');
const { VISIBLE_PRODUCT_SQL_AND } = require('../utils/productVisibility');

module.exports.getDynamicFilters = async (req, res, next) => {
  try {
    const catId = req.query.catId ? Number(req.query.catId) : null;
    console.log(chalk.red('getDynamicFilters catId:'), catId);

    const filters = extractFiltersFromQuery(req.query);
    const filterKeys = Object.keys(filters);
    console.log(chalk.blue('getDynamicFilters trigger'), { catId, filterKeys });

    if (!filterKeys.length && !catId) {
      return res.status(400).json({ error: 'At least one filter or catId is required' });
    }

    // Load all filter fields (same as getProducts)
    const allFilterFields = await FilterField.findAll({
      attributes: ['id', 'field_name', 'field_type', 'sort_order'],
      order: [['sort_order', 'ASC']],
      raw: true,
    });

    // Create field name to ID mapping
    const fieldIdMap = allFilterFields.reduce((acc, field) => {
      acc[field.field_name] = field.id;
      return acc;
    }, {});

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
      return {
        joinClauses: categoryJoin + built.joinClauses,
        whereClauses: built.whereClauses,
        replacements: built.replacements,
      };
    };

    // Now for EACH field compute which values are available in filtered products
    const results = [];

    for (const field of allFilterFields) {
      // Handle Product Price specially - get min/max instead of discrete values
      if (field.field_name === 'Product Price') {
        const { joinClauses, whereClauses, replacements } = buildJoins();
        const priceSql = `
          WITH base_products AS (
            SELECT DISTINCT p.id, p.product_price
            FROM products p
            ${joinClauses}
            WHERE 1=1
            ${whereClauses}
            ${VISIBLE_PRODUCT_SQL_AND}
          )
          SELECT 
            MIN(product_price) as min_price,
            MAX(product_price) as max_price
          FROM base_products
          WHERE product_price IS NOT NULL AND product_price > 0;
        `;

        const priceResult = await sequelize.query(priceSql, {
          replacements,
          type: QueryTypes.SELECT,
        });

        if (priceResult.length > 0 && priceResult[0].min_price !== null) {
          const minPrice = parseFloat(priceResult[0].min_price) || 0;
          const maxPrice = parseFloat(priceResult[0].max_price) || 0;
          
          // Create price breakpoints (similar to static filter behavior)
          const priceBreakpoints = [];
          const step = Math.max(1, Math.floor((maxPrice - minPrice) / 10));
          for (let i = minPrice; i <= maxPrice; i += step) {
            priceBreakpoints.push(i.toFixed(2));
          }
          if (priceBreakpoints[priceBreakpoints.length - 1] !== maxPrice.toFixed(2)) {
            priceBreakpoints.push(maxPrice.toFixed(2));
          }

          results.push({
            filter_field_id: field.id,
            field_name: field.field_name,
            field_type: field.field_type,
            sort_order: field.sort_order,
            values: priceBreakpoints,
          });
        }
        continue;
      }

      // Facet list: same scope as product list (only values on matching products)
      const { joinClauses, whereClauses, replacements } = buildJoins();

      const sql = `
        WITH base_products AS (
          SELECT DISTINCT p.id
          FROM products p
          ${joinClauses}
          WHERE 1=1
          ${whereClauses}
          ${VISIBLE_PRODUCT_SQL_AND}
        )
        ${DISTINCT_FILTER_VALUE_SQL}
      `;

      const fieldRepl = { ...replacements, fieldId: field.id };

      console.log(chalk.cyan(`\n========== SQL QUERY FOR FIELD: ${field.field_name} ==========`));
      console.log(chalk.white(sql));
      console.log(chalk.yellow('\nREPLACEMENTS:'));
      console.log(JSON.stringify(fieldRepl, null, 2));

      const values = await sequelize.query(sql, {
        replacements: fieldRepl,
        type: QueryTypes.SELECT,
      });

      if (values.length > 0) {
        results.push({
          filter_field_id: field.id,
          field_name: field.field_name,
          field_type: field.field_type,
          sort_order: field.sort_order,
          values: values.map((v) => v.val),
        });
      }
    }

    normalizeFilterResultsSortOrder(results);

    console.log(chalk.green(`Dynamic filters found: ${results.length}`));
    res.json(results);
  } catch (err) {
    console.error(chalk.red('getDynamicFilters error:'), err);
    next(err);
  }
};
