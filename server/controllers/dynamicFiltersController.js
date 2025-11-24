const { sequelize, FilterField } = require('../models');
const { QueryTypes } = require('sequelize');
const chalk = require('chalk');

module.exports.getDynamicFilters = async (req, res, next) => {
  try {
    const catId = req.query.catId ? Number(req.query.catId) : null;
    console.log(chalk.red('getDynamicFilters catId:'), catId);

    // Copy query and strip non-filter params
    const filters = { ...req.query };
    delete filters.catId;
    delete filters.limit;
    delete filters.offset;
    delete filters.sortBy;

    const filterKeys = Object.keys(filters);
    console.log(chalk.blue('getDynamicFilters trigger'), { catId, filterKeys });

    if (!filterKeys.length && !catId) {
      return res.status(400).json({ error: 'At least one filter or catId is required' });
    }

    // Load all filter fields (same as getProducts)
    const allFilterFields = await FilterField.findAll({
      attributes: ['id', 'field_name', 'field_type', 'sort_order'],
      raw: true,
    });

    // Create field name to ID mapping
    const fieldIdMap = allFilterFields.reduce((acc, field) => {
      acc[field.field_name] = field.id;
      return acc;
    }, {});

    // Build base filters (shared for ALL dynamic fields) - SAME AS getProducts
    let joinClauses = '';
    let whereClauses = '';
    const replacements = {};
    let joinIndex = 0;

    // Category filter (same as getProducts)
    if (catId) {
      joinClauses += `
        JOIN product_categories pc
          ON pc.product_id = p.id
         AND pc.category_id = :catId
      `;
      replacements.catId = catId;
    }

    // Build filter joins - EXACTLY like getProducts
    for (const [fieldName, rawValue] of Object.entries(filters)) {
      if (!rawValue) continue;

      // Special case: Product Price works on products.product_price
      if (fieldName === 'Product Price') {
        const [minPrice, maxPrice] = String(rawValue)
          .split(',')
          .map((v) => parseFloat(v) || 0);

        whereClauses += `
          AND p.product_price BETWEEN :minPrice AND :maxPrice
        `;
        replacements.minPrice = minPrice;
        replacements.maxPrice = maxPrice;
        continue;
      }

      if (!fieldIdMap[fieldName]) continue;
      const fieldId = fieldIdMap[fieldName];
      const fieldDef = allFilterFields.find(f => f.field_name === fieldName);

      if (fieldDef.field_type === 'checkbox') {
        const values = String(rawValue).split(',').map(v => v.trim());
        const alias = `pf_check${joinIndex}`;

        joinClauses += `
          JOIN product_filters ${alias}
            ON ${alias}.product_id = p.id
           AND ${alias}.filter_field_id = ${fieldId}
           AND EXISTS (
             SELECT 1
             FROM unnest(string_to_array(${alias}.filter_value, ',')) AS filter_val
             CROSS JOIN unnest(ARRAY[:checkVals${joinIndex}]::text[]) AS selected_val
             WHERE LOWER(TRIM(REGEXP_REPLACE(filter_val, '\\s+', ' ', 'g'))) 
                   LIKE '%' || LOWER(TRIM(REGEXP_REPLACE(selected_val, '\\s+', ' ', 'g'))) || '%'
           )
        `;

        replacements[`checkVals${joinIndex}`] = values;
        joinIndex++;
      } else if (fieldDef.field_type === 'range') {
        const [min, max] = String(rawValue)
          .split(',')
          .map((v) => parseFloat(v) || 0);
        const alias = `pf_range${joinIndex}`;

        joinClauses += `
          JOIN product_filters ${alias}
            ON ${alias}.product_id = p.id
           AND ${alias}.filter_field_id = ${fieldId}
        `;

        whereClauses += `
          AND CAST(regexp_replace(${alias}.filter_value, '[^0-9\\.]', '', 'g') AS FLOAT)
              BETWEEN :min${joinIndex} AND :max${joinIndex}
        `;

        replacements[`min${joinIndex}`] = min;
        replacements[`max${joinIndex}`] = max;
        joinIndex++;
      }
    }

    // Now for EACH field compute which values are available in filtered products
    const results = [];

    for (const field of allFilterFields) {
      // Handle Product Price specially - get min/max instead of discrete values
      if (field.field_name === 'Product Price') {
        const priceSql = `
          WITH base_products AS (
            SELECT DISTINCT p.id, p.product_price
            FROM products p
            ${joinClauses}
            WHERE 1=1
            ${whereClauses}
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

      // FIXED SQL: CROSS JOIN before WHERE
      const sql = `
        WITH base_products AS (
          SELECT DISTINCT p.id
          FROM products p
          ${joinClauses}
          WHERE 1=1
          ${whereClauses}
        )
        SELECT DISTINCT cleaned.val
        FROM product_filters pf
        CROSS JOIN LATERAL unnest(string_to_array(pf.filter_value, ',')) AS raw_val(val)
        CROSS JOIN LATERAL (SELECT trim(raw_val.val) AS val) AS cleaned
        JOIN base_products bp ON bp.id = pf.product_id
        WHERE pf.filter_field_id = :fieldId
          AND cleaned.val <> ''
        ORDER BY cleaned.val;
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

    console.log(chalk.green(`Dynamic filters found: ${results.length}`));
    res.json(results);
  } catch (err) {
    console.error(chalk.red('getDynamicFilters error:'), err);
    next(err);
  }
};
