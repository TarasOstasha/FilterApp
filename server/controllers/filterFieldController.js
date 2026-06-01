const createHttpError = require('http-errors')
const { sequelize, FilterField } = require('../models');
const { QueryTypes } = require('sequelize');
const chalk = require('chalk');
const { DISTINCT_FILTER_VALUE_SQL } = require('../utils/filterQuery');
const { normalizeFilterResultsSortOrder } = require('../utils/filterFieldOrder');

module.exports.getAllFilterFields = async (req, res, next) => {
  try {
    const catId = req.query.catId ? Number(req.query.catId) : null;
    console.log(chalk.blue('getAllFilterFields catId:'), catId);

    // Load all filter fields
    const allFilterFields = await FilterField.findAll({
      attributes: ['id', 'field_name', 'field_type', 'sort_order'],
      order: [['sort_order', 'ASC']],
      raw: true,
    });

    // Build category filter if provided
    let categoryJoin = '';
    const replacements = {};
    
    if (catId) {
      categoryJoin = `
        JOIN product_categories pc
          ON pc.product_id = p.id
         AND pc.category_id = :catId
      `;
      replacements.catId = catId;
    }

    // For each field, get the distinct values from products in this category
    const results = [];

    for (const field of allFilterFields) {
      const sql = `
        WITH base_products AS (
          SELECT DISTINCT p.id
          FROM products p
          ${categoryJoin}
          WHERE 1=1
        )
        ${DISTINCT_FILTER_VALUE_SQL}
      `;

      const fieldRepl = { ...replacements, fieldId: field.id };

      console.log(chalk.cyan(`Fetching values for field: ${field.field_name}`));

      const values = await sequelize.query(sql, {
        replacements: fieldRepl,
        type: QueryTypes.SELECT,
      });

      if (values.length > 0) {
        results.push({
          id: field.id,
          field_name: field.field_name,
          field_type: field.field_type,
          sort_order: field.sort_order,
          allowed_values: values.map((v) => v.val),
        });
      }
    }

    normalizeFilterResultsSortOrder(results);

    console.log(chalk.green(`getAllFilterFields found ${results.length} fields with values`));
    return res.status(200).send(results);
  } catch (err) {
    console.error(chalk.red('getAllFilterFields error:'), err);
    next(err);
  }
};
