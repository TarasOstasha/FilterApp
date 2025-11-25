
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');
const chalk = require('chalk');

// module.exports.getDynamicFilters = async (req, res, next) => {
//   try {
//     const criteria = req.query;
//     const keys = Object.keys(criteria);
//     console.log(chalk.blue('getDynamicFilters trigger'));
//     if (!keys.length) {
//       return res.status(400).json({ error: 'At least one filter query param is required' });
//     }

//     let joins = '';
//     const replacements = {};

//     keys.forEach((rawKey, idx) => {
//       // Normalize filter field name (e.g., productTypes → Product Type)
//       const decodedKey = decodeURIComponent(rawKey)
//         .replace(/\+/g, ' ')
//         .replace(/\s*\/\s*/g, ' / ')
//         .replace(/\s+/g, ' ')
//         .trim();

//       let filterFieldName = decodedKey
//         .replace(/([a-z])([A-Z])/g, '$1 $2')
//         .replace(/^./, c => c.toUpperCase());

//       if (!decodedKey.includes(' ') && filterFieldName.endsWith('s')) {
//         filterFieldName = filterFieldName.slice(0, -1);
//       }

//       const rawVal = criteria[rawKey];
//       const csv = Array.isArray(rawVal) ? rawVal.join(',') : String(rawVal);
//       if (!csv.trim()) return;

//       console.log(chalk.yellow(`Dynamic filter #${idx}: ${filterFieldName} → [${csv}]`));

//       joins += `
//         JOIN product_filters pf${idx}
//           ON pf${idx}.product_id = base.product_id
//          AND pf${idx}.filter_field_id = (
//                SELECT id FROM filter_fields WHERE field_name = :fieldName${idx}
//              )
//          AND pf${idx}.filter_value = ANY(string_to_array(:csv${idx}, ','))
//       `;

//       replacements[`fieldName${idx}`] = filterFieldName;
//       replacements[`csv${idx}`] = csv;
//     });

//     if (!joins.trim()) {
//       return res.status(400).json({ error: 'No valid filters provided' });
//     }

//     const sql = `
//       WITH matched AS (
//         SELECT base.product_id
//         FROM product_filters base
//         ${joins}
//       )
//       SELECT
//         ff.id AS filter_field_id,
//         ff.field_name,
//         ff.field_type,
//         JSON_AGG(DISTINCT cleaned.val ORDER BY cleaned.val) AS values
//       FROM product_filters pf
//       JOIN matched m
//         ON pf.product_id = m.product_id

//       CROSS JOIN LATERAL
//         unnest(string_to_array(pf.filter_value, ',')) AS raw_val(val)
//       CROSS JOIN LATERAL
//         (SELECT trim(raw_val.val) AS val) AS cleaned

//       JOIN filter_fields ff
//         ON ff.id = pf.filter_field_id

//       WHERE cleaned.val <> ''
//         AND (
//           ff.field_type = 'range'
//           OR (ff.field_type = 'checkbox' AND cleaned.val = ANY(string_to_array(ff.allowed_values, ',')))
//         )
//       GROUP BY ff.id, ff.field_name, ff.field_type
//       ORDER BY ff.sort_order;
//     `;

//     const results = await sequelize.query(sql, {
//       replacements,
//       type: QueryTypes.SELECT
//     });
//     console.log(chalk.green(`Dynamic filters found: ${results.length}`));
//     res.json(results);
//   } catch (err) {
//     next(err);
//   }
// };


module.exports.getDynamicFilters = async (req, res, next) => {
  try {
    const catId = req.query.catId ? Number(req.query.catId) : null;
    console.log(chalk.red('getDynamicFilters catId:'), catId);
    
    // Ignore non-filter params
    const criteria = { ...req.query };
    delete criteria.catId;
    delete criteria.limit;
    delete criteria.offset;
    delete criteria.sortBy;

    const keys = Object.keys(criteria);
    console.log(chalk.blue('getDynamicFilters trigger'), { catId, keys });

    // Allow: either filters OR just catId (so initial page load works)
    if (!keys.length && !catId) {
      return res.status(400).json({ error: 'At least one filter or catId is required' });
    }

    // Get all filter fields first
    const allFieldsQuery = `
      SELECT id, field_name, field_type, sort_order 
      FROM filter_fields 
      ORDER BY sort_order
    `;
    const allFields = await sequelize.query(allFieldsQuery, { type: QueryTypes.SELECT });

    const replacements = {};
    if (catId) replacements.catId = catId;

    // Category join (used in all queries)
    const categoryJoin = catId
      ? `JOIN product_categories pc ON pc.product_id = base.product_id AND pc.category_id = :catId`
      : '';

    // For each filter field, calculate which values would return products
    // when combined with all OTHER active filters
    const results = [];

    for (const field of allFields) {
      const fieldName = field.field_name;
      
      // Build joins for all filters EXCEPT the current field
      let joins = '';
      let joinIdx = 0;
      const fieldReplacements = { ...replacements };

      keys.forEach((rawKey) => {
        const decodedKey = decodeURIComponent(rawKey)
          .replace(/\+/g, ' ')
          .replace(/\s*\/\s*/g, ' / ')
          .replace(/\s+/g, ' ')
          .trim();

        let filterFieldName = decodedKey
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/^./, c => c.toUpperCase());

        if (!decodedKey.includes(' ') && filterFieldName.endsWith('s')) {
          filterFieldName = filterFieldName.slice(0, -1);
        }

        const rawVal = criteria[rawKey];
        const csv = Array.isArray(rawVal) ? rawVal.join(',') : String(rawVal);
        if (!csv.trim()) return;

        joins += `
          JOIN product_filters pf${joinIdx}
            ON pf${joinIdx}.product_id = base.product_id
           AND pf${joinIdx}.filter_field_id = (
                 SELECT id FROM filter_fields WHERE field_name = :fieldName${joinIdx}
               )
           AND string_to_array(pf${joinIdx}.filter_value, ',') <@ string_to_array(:csv${joinIdx}, ',')
        `;

        fieldReplacements[`fieldName${joinIdx}`] = filterFieldName;
        fieldReplacements[`csv${joinIdx}`] = csv;
        joinIdx++;
      });

      // Query to get valid values for this field
      const sql = `
        WITH base_products AS (
          SELECT DISTINCT base.product_id
          FROM product_filters base
          ${categoryJoin}
          ${joins}
        )
        SELECT DISTINCT cleaned.val
        FROM product_filters pf
        JOIN base_products bp ON pf.product_id = bp.product_id
        JOIN filter_fields ff ON ff.id = pf.filter_field_id
        CROSS JOIN LATERAL unnest(string_to_array(pf.filter_value, ',')) AS raw_val(val)
        CROSS JOIN LATERAL (SELECT trim(raw_val.val) AS val) AS cleaned
        WHERE ff.field_name = :currentFieldName
          AND cleaned.val <> ''
          AND (
            ff.field_type = 'range'
            OR ff.field_type = 'checkbox'
          )
        ORDER BY cleaned.val
      `;

      fieldReplacements.currentFieldName = fieldName;

      const values = await sequelize.query(sql, {
        replacements: fieldReplacements,
        type: QueryTypes.SELECT
      });

      // Only include this field if it has values
      if (values.length > 0) {
        results.push({
          filter_field_id: field.id,
          field_name: field.field_name,
          field_type: field.field_type,
          sort_order: field.sort_order,
          values: values.map(v => v.val)
        });
      }
    }

    console.log(chalk.green(`Dynamic filters found: ${results.length}`));
    
    // Debug logging
    console.log(chalk.cyan('=== DYNAMIC FILTER RESPONSE ==='));
    console.log(chalk.yellow('Query params:'), JSON.stringify(criteria, null, 2));
    results.forEach(r => {
      console.log(chalk.magenta(`${r.field_name}:`), r.values);
    });
    console.log(chalk.cyan('=============================='));
    
    res.json(results);
  } catch (err) {
    next(err);
  }
};
