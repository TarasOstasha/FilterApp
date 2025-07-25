// const { sequelize } = require('../models')

// module.exports.getDynamicFilters = async (req, res, next) => {
//   try {
//     let { productTypes } = req.query

//     // Ensure productTypes is an array
//     const productTypeArray = Array.isArray(productTypes)
//       ? productTypes
//       : typeof productTypes === 'string'
//       ? [productTypes]
//       : []

//     if (!productTypeArray.length) {
//       return res.status(400).json({ error: 'Missing productTypes' })
//     }

//     // Create PostgreSQL array literal
//     const formattedArray = `'{${productTypeArray
//       .map((val) => `"${val}"`)
//       .join(',')}}'`

//     const results = await sequelize.query(
//       `
//         SELECT
//         ff.id AS filter_field_id,
//         ff.field_name,
//         ff.field_type,
//         JSON_AGG(DISTINCT cleaned.val ORDER BY cleaned.val) AS values
//         FROM product_filters pt
//         JOIN product_filters pf
//         ON pf.product_id = pt.product_id
//         JOIN filter_fields ff
//         ON ff.id = pf.filter_field_id
//         JOIN filter_fields ftype
//         ON ftype.id = pt.filter_field_id

//         -- explode comma-separated strings into one row per segment
//         CROSS JOIN LATERAL unnest(string_to_array(pf.filter_value, ',')) AS raw(val)
//         -- trim off any stray spaces
//         CROSS JOIN LATERAL (SELECT trim(raw.val) AS val) AS cleaned

//         WHERE ftype.field_name = 'Product Type'
//         AND pt.filter_value = ANY(${formattedArray})
//         AND cleaned.val <> ''     -- drop empty
//         GROUP BY ff.id, ff.field_name, ff.field_type
//         HAVING COUNT(*) > 0
//         ORDER BY ff.sort_order;

//       `,
//       { type: sequelize.QueryTypes.SELECT },
//     )

//     res.json(results)
//   } catch (error) {
//     console.error('getDynamicFilters error:', error)
//     res.status(500).json({ error: 'Internal server error' })
//   }
// }




// server/controllers/dynamicFiltersController.js =*** JUST FOR 1 FILTER
// const { sequelize } = require('../models');
// const { QueryTypes } = require('sequelize');
// const chalk = require('chalk');

// module.exports.getDynamicFilters = async (req, res, next) => {
//   try {
//     // 1️⃣ Read exactly one filter-param key (e.g. "productTypes")
//     const keys = Object.keys(req.query);
//     if (keys.length !== 1) {
//       return res
//         .status(400)
//         .json({ error: 'Please supply exactly one filter, e.g. ?productTypes=Banner Stand' });
//     }
//     const paramKey  = keys[0];            // "productTypes"
//     const csvValues = req.query[paramKey]; // e.g. "Banner Stand" or "Banner Stand,Backdrop"

//     console.log(
//       chalk.yellow(`Dynamic filter requested: ${paramKey} with values: ${csvValues}`)
//     );

//     if (typeof csvValues !== 'string' || !csvValues.trim()) {
//       return res
//         .status(400)
//         .json({ error: `Missing or invalid ${paramKey}` });
//     }

//     // 2️⃣ Compute actual filter_field_name ("Product Type")
//     let filterFieldName = paramKey
//       .replace(/([A-Z])/g, ' $1')
//       .replace(/^./, c => c.toUpperCase());
//     if (filterFieldName.endsWith('s')) {
//       filterFieldName = filterFieldName.slice(0, -1);
//     }

//     // 3️⃣ Run the “explode & split on commas” SQL
//     const sql = `
//       SELECT
//         ff.id           AS filter_field_id,
//         ff.field_name,
//         ff.field_type,
//         JSON_AGG(DISTINCT cleaned.val ORDER BY cleaned.val) AS values
//       FROM product_filters pt

//       JOIN product_filters pf
//         ON pf.product_id   = pt.product_id

//       CROSS JOIN LATERAL
//         unnest(string_to_array(pf.filter_value, ',')) AS raw(val)
//       CROSS JOIN LATERAL
//         (SELECT trim(raw.val) AS val) AS cleaned

//       JOIN filter_fields ff
//         ON ff.id = pf.filter_field_id
//       JOIN filter_fields ftype
//         ON ftype.id = pt.filter_field_id

//       WHERE ftype.field_name = :filterFieldName
//         AND pt.filter_value  = ANY(string_to_array(:csvValues, ','))
//         AND cleaned.val     <> ''
//       GROUP BY ff.id, ff.field_name, ff.field_type
//       HAVING COUNT(*) > 0
//       ORDER BY ff.sort_order;
//     `;

//     const results = await sequelize.query(sql, {
//       replacements: {
//         filterFieldName,
//         csvValues
//       },
//       type: QueryTypes.SELECT
//     });

//     res.json(results);
//   } catch (err) {
//     next(err);
//   }
// };


// server/controllers/dynamicFiltersController.js
// const { sequelize }   = require('../models');
// const { QueryTypes }  = require('sequelize');
// const chalk           = require('chalk');

// module.exports.getDynamicFilters = async (req, res, next) => {
//   try {
//     const criteria = req.query;            // e.g. { productTypes:'Banner Stand,Tabletop,Backdrop', 'Print Type':'Double-Sided', 'Product Details':'Kit' }
//     const keys = Object.keys(criteria);

//     if (keys.length === 0) {
//       return res
//         .status(400)
//         .json({ error: 'At least one filter query param is required' });
//     }

//     let joins = '';
//     const replacements = {};

//     keys.forEach((rawKey, idx) => {
//       // 1) Decode + normalize the param-name into a human field name
//       //    If rawKey has spaces, use it verbatim
//       //    Otherwise split camelCase → Title Case and singularize
//       const decodedKey = rawKey.replace(/\+/g, ' ').trim();
//       let filterFieldName = decodedKey.replace(
//         /([a-z])([A-Z])/g,
//         '$1 $2'
//       ).replace(/^./, c => c.toUpperCase());

//       if (!decodedKey.includes(' ') && filterFieldName.endsWith('s')) {
//         // only singularize if it started as a single camel word
//         filterFieldName = filterFieldName.slice(0, -1);
//       }

//       // 2) Normalize incoming values into a CSV string
//       const rawVal = criteria[rawKey];
//       const csv = Array.isArray(rawVal) ? rawVal.join(',') : String(rawVal);

//       if (!csv.trim()) return; // skip empty filters

//       console.log(
//         chalk.yellow(`Dynamic filter #${idx}: ${filterFieldName} → [${csv}]`)
//       );

//       // 3) Build one JOIN per filter
//       joins += `
//         JOIN product_filters pf${idx}
//           ON pf${idx}.product_id       = base.product_id
//          AND pf${idx}.filter_field_id  = (
//                SELECT id 
//                  FROM filter_fields 
//                 WHERE field_name = :fieldName${idx}
//              )
//          AND pf${idx}.filter_value     = ANY(
//                string_to_array(:csv${idx}, ',')
//              )
//       `;

//       // 4) Collect replacements for Sequelize
//       replacements[`fieldName${idx}`] = filterFieldName;
//       replacements[`csv${idx}`]       = csv;
//     });

//     if (!joins.trim()) {
//       return res
//         .status(400)
//         .json({ error: 'No valid filters provided' });
//     }

//     // 5) CTE to get only products matching ALL filters, then explode & aggregate
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
//       FROM matched m
//       JOIN product_filters pf
//         ON pf.product_id = m.product_id

//       CROSS JOIN LATERAL
//         unnest(string_to_array(pf.filter_value, ',')) AS raw_val(val)
//       CROSS JOIN LATERAL
//         (SELECT trim(raw_val.val) AS val) AS cleaned

//       JOIN filter_fields ff
//         ON ff.id = pf.filter_field_id

//       WHERE cleaned.val <> ''
//       GROUP BY ff.id, ff.field_name, ff.field_type
//       ORDER BY ff.sort_order;
//     `;

//     const results = await sequelize.query(sql, {
//       replacements,
//       type: QueryTypes.SELECT,
//     });

//     res.json(results);
//   }
//   catch (err) {
//     next(err);
//   }
// };





// server/controllers/dynamicFiltersController.js
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');
const chalk = require('chalk');

module.exports.getDynamicFilters = async (req, res, next) => {
  try {
    const criteria = req.query;
    const keys = Object.keys(criteria);

    if (!keys.length) {
      return res
        .status(400)
        .json({ error: 'At least one filter query param is required' });
    }

    let joins = '';
    const replacements = {};

    keys.forEach((rawKey, idx) => {
      // 1) Properly decode & normalize whitespace around "/" and everywhere:
      const decodedKey = decodeURIComponent(rawKey)
        .replace(/\+/g,' ')
        .replace(/\s*\/\s*/g,' / ')
        .replace(/\s+/g,' ')
        .trim();

      // 2) CamelCase → Title Case → singular (if it was originally a single word)
      let filterFieldName = decodedKey
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, c => c.toUpperCase());
      if (!decodedKey.includes(' ') && filterFieldName.endsWith('s')) {
        filterFieldName = filterFieldName.slice(0, -1);
      }

      // 3) Normalize incoming values to a CSV
      const rawVal = criteria[rawKey];
      const csv = Array.isArray(rawVal) ? rawVal.join(',') : String(rawVal);
      if (!csv.trim()) return;  // skip empty

      console.log(chalk.yellow(
        `Dynamic filter #${idx}: ${filterFieldName} → [${csv}]`
      ));

      // 4) Build the JOIN
      joins += `
        JOIN product_filters pf${idx}
          ON pf${idx}.product_id       = base.product_id
         AND pf${idx}.filter_field_id  = (
               SELECT id
                 FROM filter_fields
                WHERE field_name = :fieldName${idx}
             )
         AND pf${idx}.filter_value     = ANY(
               string_to_array(:csv${idx}, ',')
             )
      `;

      // 5) Bind replacements
      replacements[`fieldName${idx}`] = filterFieldName;
      replacements[`csv${idx}`]       = csv;
    });

    if (!joins.trim()) {
      return res
        .status(400)
        .json({ error: 'No valid filters provided' });
    }

    // 6) CTE + explode & aggregate
    const sql = `
      WITH matched AS (
        SELECT base.product_id
        FROM product_filters base
        ${joins}
      )
      SELECT
        ff.id AS filter_field_id,
        ff.field_name,
        ff.field_type,
        JSON_AGG(DISTINCT cleaned.val ORDER BY cleaned.val) AS values
      FROM matched m
      JOIN product_filters pf
        ON pf.product_id = m.product_id

      CROSS JOIN LATERAL
        unnest(string_to_array(pf.filter_value, ',')) AS raw_val(val)
      CROSS JOIN LATERAL
        (SELECT trim(raw_val.val) AS val) AS cleaned

      JOIN filter_fields ff
        ON ff.id = pf.filter_field_id

      WHERE cleaned.val <> ''
      GROUP BY ff.id, ff.field_name, ff.field_type
      ORDER BY ff.sort_order;
    `;

    const results = await sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT
    });

    res.json(results);
  }
  catch (err) {
    next(err);
  }
};



