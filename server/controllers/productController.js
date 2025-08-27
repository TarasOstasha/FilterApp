const createHttpError = require('http-errors')
const chalk = require('chalk')
const { Product, Category, FilterField, ProductFilter, sequelize } = require('../models')
const { Op, fn, col, where, cast, QueryTypes } = require('sequelize');


module.exports.getAllProducts = async (req, res, next) => {
  const { limit, offset } = req.pagination
  try {
    const foundProducts = await Product.findAll({
      limit,
      offset,
      order: [['product_price', 'ASC']], // or your preferred default sort
    });
    console.log(foundProducts, 'foundProducts');
    res.status(200).send(foundProducts)
  } catch (err) {
    next(err)
  }
}

module.exports.getMegaFilteredProductItems = async (req, res, next) => {
  try {
    const limit = 54;
    const { sortBy = 'price_asc', searchTerms = '' } = req.query;

    // 1) Determine sort order
    let order;
    switch (sortBy) {
      case 'price_desc':
        order = [['product_price', 'DESC']];
        break;
      case 'price_asc':
      default:
        order = [['product_price', 'ASC']];
        break;
    }

    // 2) Split the search string by spaces
    const searchWords = searchTerms.split(' ').filter(Boolean);

    // 3) Build an array of conditions: each word must match either product_name OR product_code
    // We'll combine them with [Op.and], so all words must be present.
    const andConditions = searchWords.map((word) => ({
      [Op.or]: [
        { product_name: { [Op.iLike]: `%${word}%` } },
        { product_code: { [Op.iLike]: `%${word}%` } },
      ],
    }));

    // 4) Construct the final "where" object
    // If there are no words, we can omit the condition entirely.
    const where = andConditions.length
      ? { [Op.and]: andConditions }
      : {};

    // 5) Execute the query
    const foundProducts = await Product.findAll({
      where,
      order,
      limit,
    });

    // 6) Send results
    res.status(200).send(foundProducts);
  } catch (err) {
    next(err);
  }
};

module.exports.getPriceRange = async (req, res, next) => {
  // console.log(chalk.blue('getPriceRange called with query params:'), req.query);
  // console.log(chalk.blue('Request query:', JSON.stringify(req.query, null, 2)));
  try {
    const priceField = await FilterField.findOne({
      where: { field_name: 'Product Price' },
      attributes: ['allowed_values'],
      raw: true,
    });
    
    const priceBreakpoints = priceField?.allowed_values
      ?.split(',')
      .map((v) => parseFloat(v.trim()))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);
    const allFilterFields = await FilterField.findAll({
      attributes: ['id', 'field_name', 'field_type', 'allowed_values'],
      raw: true,
    });
   
    const filterMap = {};
    for (const f of allFilterFields) {
      filterMap[f.field_name] = {
        id: f.id,
        type: f.field_type,
        allowed_values: f.allowed_values,
      };
    }

    let joins = '';
    let productPriceCondition = '';
    const replacements = {};
    let checkIdx = 0;
    let rangeIdx = 0;
    //console.log(chalk.blue('Request query:', JSON.stringify(req.query, null, 2)));
    // Handle Price (range slider) → forced to use known breakpoints
    if (req.query['Product Price']) {
      const [minInput, maxInput] = String(req.query['Product Price']).split(',').map((v) => parseFloat(v) || 0);
      
      // Find the next closest breakpoints
      const minPrice = priceBreakpoints.find((v) => v >= minInput) ?? priceBreakpoints[0];
      const maxPrice = [...priceBreakpoints].reverse().find((v) => v <= maxInput) ?? priceBreakpoints[priceBreakpoints.length - 1];
      //console.log(chalk.green('Using Price range:', minPrice, maxPrice));
      replacements.minPrice = minPrice;
      replacements.maxPrice = maxPrice;
      //console.log(chalk.yellow('Replacements for price range:', minPrice, maxPrice));
      productPriceCondition = `WHERE p.product_price BETWEEN :minPrice AND :maxPrice`;
      //console.log(chalk.red('Product Price condition:', productPriceCondition));
    }

    for (const fieldName of Object.keys(req.query)) {
      if (fieldName === 'Product Price') continue;

      const rawVal = req.query[fieldName];
      const field = filterMap[fieldName];
      if (!field || !rawVal) continue;

      if (field.type === 'range') {
        const [min, max] = String(rawVal).split(',').map((v) => parseFloat(v) || 0);
        replacements[`min${rangeIdx}`] = min;
        replacements[`max${rangeIdx}`] = max;
        //console.log(chalk.green(Object.keys(replacements), '<< current replacements'));
        joins += `
          JOIN product_filters pf_range${rangeIdx}
            ON pf_range${rangeIdx}.product_id = p.id
           AND pf_range${rangeIdx}.filter_field_id = ${field.id}
           AND CAST(
             regexp_replace(pf_range${rangeIdx}.filter_value, '[^0-9\\.]', '', 'g') AS double precision
           ) BETWEEN :min${rangeIdx} AND :max${rangeIdx}
        `;
        rangeIdx++;
      } else {
        const values = Array.isArray(rawVal)
          ? rawVal
          : String(rawVal).split(',').map((v) => v.trim());

        replacements[`vals${checkIdx}`] = values;
        //console.log(chalk.green(Object.keys(replacements), '<< current replacements'));
        joins += `
          JOIN product_filters pf_check${checkIdx}
            ON pf_check${checkIdx}.product_id = p.id
           AND pf_check${checkIdx}.filter_field_id = ${field.id}
           AND pf_check${checkIdx}.filter_value = ANY(ARRAY[:vals${checkIdx}]::text[])
        `;
        checkIdx++;
      }
    }

    // console.log(chalk.magenta('----- GENERATED SQL JOINS -----'));
    // console.log(joins);
    // console.log(chalk.yellow('Replacements:'), replacements);

    const [filteredRow] = await sequelize.query(
      `
      WITH filtered_products AS (
        SELECT DISTINCT p.id, p.product_price
        FROM products p
        ${joins}
        ${productPriceCondition}
      )
      SELECT 
        MIN(product_price)::numeric AS min, 
        MAX(product_price)::numeric AS max 
      FROM filtered_products;
    `,
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    const [globalRow] = await sequelize.query(
      `SELECT MIN(product_price)::numeric AS globalmin, MAX(product_price)::numeric AS globalmax FROM products;`,
      { type: QueryTypes.SELECT }
    );

    // console.log(chalk.red('Global price range:', globalRow.globalmin, globalRow.globalmax));
    // console.log(chalk.green('Filtered price range:', filteredRow.min, filteredRow.max));
    // console.log(chalk.yellow('priceBreakpoints', priceBreakpoints));

    if (Object.keys(replacements).length === 0) {
      filteredRow.min = globalRow.globalmin;
      filteredRow.max = globalRow.globalmax;
      // console.log(chalk.yellow('No filters applied → using global price range'));
    }
    //console.log(chalk.red(filteredRow.min, '<< final min'));
    //console.log(chalk.red(filteredRow.max, '<< final max'));

    res.json({
      min: parseFloat(filteredRow?.min) || 0,
      max: parseFloat(filteredRow?.max) || 0,
      breakpoints: priceBreakpoints || [],
    });
  } catch (err) {
    next(err);
  }
};

module.exports.getProducts = async (req, res, next) => {
  try {
    const filters = req.query;
    console.log(chalk.blue('getProducts called with filters:'), filters);
    const limit = parseInt(req.query.limit, 10) || 27;
    const offset = parseInt(req.query.offset, 10) || 0;
    let sortDir = 'ASC';
    if (req.query.sortBy === 'price_desc') {
      sortDir = 'DESC';
    }

    const allFilterFields = await FilterField.findAll({ raw: true });

    const fieldIdMap = allFilterFields.reduce((acc, field) => {
      acc[field.field_name] = field.id;
      return acc;
    }, {});

    let joinClauses = '';
    let whereClauses = '';
    const replacements = {};
    let joinIndex = 0;

    for (const [fieldName, rawValue] of Object.entries(filters)) {
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
        const values = String(rawValue).split(',');
        const alias = `pf_check${joinIndex}`;

        joinClauses += `
          JOIN product_filters ${alias}
            ON ${alias}.product_id = p.id
           AND ${alias}.filter_field_id = ${fieldId}
           AND ${alias}.filter_value IN (:checkVals${joinIndex})
        `;

        replacements[`checkVals${joinIndex}`] = values;
        joinIndex++;
      }

      if (fieldDef.field_type === 'range') {
        const [min, max] = String(rawValue).split(',').map(v => parseFloat(v) || 0);
        const alias = `pf_range${joinIndex}`;

        joinClauses += `
          JOIN product_filters ${alias}
            ON ${alias}.product_id = p.id
           AND ${alias}.filter_field_id = ${fieldId}
        `;

        whereClauses += `
          AND CAST(regexp_replace(${alias}.filter_value, '[^0-9.]', '', 'g') AS FLOAT)
              BETWEEN :min${joinIndex} AND :max${joinIndex}
        `;

        replacements[`min${joinIndex}`] = min;
        replacements[`max${joinIndex}`] = max;
        joinIndex++;
      }
    }

    const sql = `
      SELECT DISTINCT p.*
      FROM products p
      ${joinClauses}
      WHERE 1=1
      ${whereClauses}
      ORDER BY product_price ${sortDir}
      LIMIT :limit OFFSET :offset
    `;

    const countSql = `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM products p
      ${joinClauses}
      WHERE 1=1
      ${whereClauses}
    `;

    replacements.limit = limit;
    replacements.offset = offset;
    console.log(chalk.yellow('Final Replacements:'), replacements);
    const products = await sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT,
    });
    //console.log(chalk.green(`Fetched ${products} products`));
    const totalProductsResult = await sequelize.query(countSql, {
      replacements,
      type: QueryTypes.SELECT,
    });

    const totalProducts = totalProductsResult[0]?.total || 0;

    // === Price Breakpoint Snap Logic ===
    const priceField = await FilterField.findOne({
      where: { field_name: 'Product Price' },
      attributes: ['allowed_values'],
      raw: true,
    });

    const priceBreakpoints = priceField?.allowed_values
      ?.split(',')
      .map((v) => parseFloat(v.trim()))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b) || [];

    const actualPrices = products.map((p) => parseFloat(p.product_price)).filter((n) => !isNaN(n));
    const minPrice = Math.min(...actualPrices);
    const maxPrice = Math.max(...actualPrices);

    const snappedMin = priceBreakpoints.find((v) => v >= minPrice) ?? priceBreakpoints[0];
    const snappedMax = [...priceBreakpoints].reverse().find((v) => v <= maxPrice) ?? priceBreakpoints.at(-1);
    // console.log(snappedMin, '<< snappedMin, ');
    // console.log(snappedMax, '<< snappedMax, ');
    // console.log(priceBreakpoints, '<< priceBreakpoints, ');
    res.status(200).json({
      products,
      totalProducts,
      priceRange: {
        min: snappedMin,
        max: snappedMax,
        breakpoints: priceBreakpoints,
      },
    });
  } catch (err) {
    console.error(chalk.red('getProducts error:'), err);
    next(err);
  }
};


// module.exports.getPriceRange = async (req, res, next) => {
//   try {
//     const allFilterFields = await FilterField.findAll({
//       attributes: ['id', 'field_name', 'field_type'],
//       raw: true,
//     });

//     // Map field_name → { id, field_type }
//     const filterMap = {};
//     for (const f of allFilterFields) {
//       filterMap[f.field_name] = { id: f.id, type: f.field_type };
//     }

//     let joins = '';
//     const replacements = {};
//     let checkIdx = 0;
//     let rangeIdx = 0;

//     for (const fieldName of Object.keys(req.query)) {
//       const rawVal = req.query[fieldName];
//       const field = filterMap[fieldName];
//       if (!field || !rawVal) continue;

//       if (field.type === 'range') {
//         const [min, max] = String(rawVal)
//           .split(',')
//           .map((v) => parseFloat(v) || 0);

//         replacements[`min${rangeIdx}`] = min;
//         replacements[`max${rangeIdx}`] = max;

//         joins += `
//           JOIN product_filters pf_range${rangeIdx}
//             ON pf_range${rangeIdx}.product_id = p.id
//            AND pf_range${rangeIdx}.filter_field_id = ${field.id}
//            AND CAST(
//              regexp_replace(pf_range${rangeIdx}.filter_value, '[^0-9\\.]', '', 'g') AS double precision
//            ) BETWEEN :min${rangeIdx} AND :max${rangeIdx}
//         `;
//         rangeIdx++;
//       } else {
//         const values = Array.isArray(rawVal)
//           ? rawVal
//           : String(rawVal).split(',').map((v) => v.trim());

//         replacements[`vals${checkIdx}`] = values;

//         joins += `
//           JOIN product_filters pf_check${checkIdx}
//             ON pf_check${checkIdx}.product_id = p.id
//            AND pf_check${checkIdx}.filter_field_id = ${field.id}
//            AND pf_check${checkIdx}.filter_value = ANY(:vals${checkIdx}::text[])
//         `;
//         checkIdx++;
//       }
//     }

//     const sql = `
//       WITH filtered_products AS (
//         SELECT DISTINCT p.id, p.product_price
//         FROM products p
//         ${joins}
//       )
//       SELECT 
//         MIN(product_price)::numeric AS min, 
//         MAX(product_price)::numeric AS max 
//       FROM filtered_products;
//     `;

//     const [row] = await sequelize.query(sql, {
//       replacements,
//       type: QueryTypes.SELECT,
//     });

//     res.json({
//       min: parseFloat(row.min) || 0,
//       max: parseFloat(row.max) || 0,
//     });
//   } catch (err) {
//     next(err);
//   }
// };







module.exports.getWidthRange = async (req, res, next) => {
  try {
    const allFilterFields = await FilterField.findAll({
      attributes: ['id', 'field_name', 'field_type'],
      raw: true,
    });

    const filterMap = {};
    for (const f of allFilterFields) {
      filterMap[f.field_name] = {
        id: f.id,
        type: f.field_type,
      };
    }

    let joins = '';
    const replacements = {};
    let rangeIdx = 0;
    let checkIdx = 0;

    for (const fieldName of Object.keys(req.query)) {
      const rawVal = req.query[fieldName];
      const field = filterMap[fieldName];
      if (!field || !rawVal || fieldName === 'Display Width') continue;

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
        rangeIdx++;
      } else {
        const values = Array.isArray(rawVal)
          ? rawVal
          : String(rawVal).split(',').map((v) => v.trim());

        replacements[`vals${checkIdx}`] = values;

        joins += `
          JOIN product_filters pf_check${checkIdx}
            ON pf_check${checkIdx}.product_id = p.id
           AND pf_check${checkIdx}.filter_field_id = ${field.id}
           AND pf_check${checkIdx}.filter_value = ANY(ARRAY[:vals${checkIdx}]::text[])
        `;
        checkIdx++;
      }
    }

    const widthField = filterMap['Display Width'];
    if (!widthField) throw new Error('Display Width filter field not found');
    // get filteredRow
    const [filteredRow] = await sequelize.query(
      `
      WITH filtered_products AS (
        SELECT DISTINCT p.id
        FROM products p
        ${joins}
      )
      SELECT 
        MIN(CAST(regexp_replace(pf.filter_value, '[^0-9\\.]', '', 'g') AS double precision)) AS min,
        MAX(CAST(regexp_replace(pf.filter_value, '[^0-9\\.]', '', 'g') AS double precision)) AS max
      FROM product_filters pf
      JOIN filtered_products fp ON pf.product_id = fp.id
      WHERE pf.filter_field_id = ${widthField.id};
      `,
      { replacements, type: QueryTypes.SELECT }
    );
    // get globalRow
    const [result] = await sequelize.query(
      `
      SELECT
        MIN(CAST(regexp_replace(filter_value, '[^0-9\\.]+', '', 'g') AS double precision)) AS min,
        MAX(CAST(regexp_replace(filter_value, '[^0-9\\.]+', '', 'g') AS double precision)) AS max
      FROM product_filters
      WHERE filter_field_id = :widthFieldId
      `,
      {
        replacements: { widthFieldId: widthField.id },
        type: QueryTypes.SELECT,
      }
    );
    console.log(chalk.blue('result:'), result?.min, result?.max);
    console.log(chalk.blue('filteredRow:'), filteredRow?.min, filteredRow?.max);
    res.json({
      min: parseFloat(filteredRow?.min) || 0,
      max: parseFloat(filteredRow?.max) || 0,
      globalMin: parseFloat(result?.min) || 0,
      globalMax: parseFloat(result?.max) || 0,
    });
  } catch (err) {
    next(err);
  }
};


module.exports.getHeightRange = async (req, res, next) => {
  try {
    const allFilterFields = await FilterField.findAll({
      attributes: ['id', 'field_name', 'field_type'],
      raw: true,
    });

    const filterMap = {};
    for (const f of allFilterFields) {
      filterMap[f.field_name] = {
        id: f.id,
        type: f.field_type,
      };
    }

    let joins = '';
    const replacements = {};
    let rangeIdx = 0;
    let checkIdx = 0;

    for (const fieldName of Object.keys(req.query)) {
      const rawVal = req.query[fieldName];
      const field = filterMap[fieldName];
      if (!field || !rawVal || fieldName === 'Display Height') continue;

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
        rangeIdx++;
      } else {
        const values = Array.isArray(rawVal)
          ? rawVal
          : String(rawVal).split(',').map((v) => v.trim());

        replacements[`vals${checkIdx}`] = values;

        joins += `
          JOIN product_filters pf_check${checkIdx}
            ON pf_check${checkIdx}.product_id = p.id
           AND pf_check${checkIdx}.filter_field_id = ${field.id}
           AND pf_check${checkIdx}.filter_value = ANY(ARRAY[:vals${checkIdx}]::text[])
        `;
        checkIdx++;
      }
    }

    const heightField = filterMap['Display Height'];
    if (!heightField) throw new Error('Display Height filter field not found');

    const [filteredRow] = await sequelize.query(
      `
      WITH filtered_products AS (
        SELECT DISTINCT p.id
        FROM products p
        ${joins}
      )
      SELECT 
        MIN(CAST(regexp_replace(pf.filter_value, '[^0-9\\.]', '', 'g') AS double precision)) AS min,
        MAX(CAST(regexp_replace(pf.filter_value, '[^0-9\\.]', '', 'g') AS double precision)) AS max
      FROM product_filters pf
      JOIN filtered_products fp ON pf.product_id = fp.id
      WHERE pf.filter_field_id = ${heightField.id};
      `,
      { replacements, type: QueryTypes.SELECT }
    );
    const [result] = await sequelize.query(
      `
      SELECT
        MIN(CAST(regexp_replace(filter_value, '[^0-9\\.]+', '', 'g') AS double precision)) AS min,
        MAX(CAST(regexp_replace(filter_value, '[^0-9\\.]+', '', 'g') AS double precision)) AS max
      FROM product_filters
      WHERE filter_field_id = :heightFieldId
      `,
      {
        replacements: { heightFieldId: heightField.id },
        type: QueryTypes.SELECT,
      }
    );

    res.json({
      globalMin: parseFloat(result?.min) || 0,
      globalMax: parseFloat(result?.max) || 0,
      min: parseFloat(filteredRow?.min) || 0,
      max: parseFloat(filteredRow?.max) || 0,
    });
  } catch (err) {
    next(err);
  }
};