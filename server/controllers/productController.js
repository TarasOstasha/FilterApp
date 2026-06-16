const createHttpError = require('http-errors')
const chalk = require('chalk')
const { Product, Category, FilterField, ProductFilter, sequelize } = require('../models')
const { Op, fn, col, where, cast, QueryTypes } = require('sequelize');
const {
  META_QUERY_KEYS,
  extractFiltersFromQuery,
  parseCheckboxFilterValues,
  appendCheckboxFilterJoins,
  buildFilterJoins,
} = require('../utils/filterQuery');
const { visibleProductWhere, visibleProductSql, VISIBLE_PRODUCT_SQL_AND } = require('../utils/productVisibility');
const {
  parsePriceBreakpoints,
  snapMinToBreakpoint,
  snapMaxToBreakpoint,
} = require('../utils/priceBreakpoints');


module.exports.getAllProducts = async (req, res, next) => {
  const { limit, offset } = req.pagination
  try {
    const foundProducts = await Product.findAll({
      where: visibleProductWhere(),
      limit,
      offset,
      order: [['product_price', 'ASC']], // or your preferred default sort
    });
    console.log(chalk.yellow(foundProducts, 'foundProducts'));
    res.status(200).send(foundProducts)
  } catch (err) {
    next(err)
  }
}

module.exports.getMegaFilteredProductItems = async (req, res, next) => {
  try {
    const limit = 54;
    const { sortBy = 'price_asc', searchTerms = '', catId = null } = req.query;

    // 1) Determine sort order
    let order;
    switch (sortBy) {
      case 'price_desc':
        order = [['product_price', 'DESC']];
        break;
      case 'most_popular':
        order = [['most_popular', 'DESC']];
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

    // 4) Execute the query (scoped to category when catId is provided)
    const productWhereClauses = [];
    if (andConditions.length) {
      productWhereClauses.push({ [Op.and]: andConditions });
    }
    if (catId) {
      const safeCatId = parseInt(catId, 10);
      if (Number.isFinite(safeCatId)) {
        productWhereClauses.push({
          id: {
            [Op.in]: sequelize.literal(
              `(SELECT product_id FROM product_categories WHERE category_id = ${safeCatId})`
            ),
          },
        });
      }
    }
    productWhereClauses.push(visibleProductWhere());

    const productWhere =
      productWhereClauses.length === 1
        ? productWhereClauses[0]
        : { [Op.and]: productWhereClauses };

    const foundProducts = await Product.findAll({
      where: productWhere,
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
    const catId = req.query.catId || null;
    
    const priceField = await FilterField.findOne({
      where: { field_name: 'Product Price' },
      attributes: ['allowed_values'],
      raw: true,
    });
    
    const priceBreakpoints = parsePriceBreakpoints(priceField?.allowed_values);
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
    
    // Add category filter if catId exists
    if (catId) {
      joins += `
        JOIN product_categories pc
          ON pc.product_id = p.id
         AND pc.category_id = :catId
      `;
      replacements.catId = catId;
    }
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
      if (fieldName === 'Product Price' || META_QUERY_KEYS.has(fieldName)) continue;

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

    // console.log(chalk.magenta('----- GENERATED SQL JOINS -----'));
    // console.log(joins);
    // console.log(chalk.yellow('Replacements:'), replacements);

    const visibilityCondition = `WHERE ${visibleProductSql('p')}`;
    const filteredProductsWhere = productPriceCondition
      ? `${productPriceCondition} AND ${visibleProductSql('p')}`
      : visibilityCondition;

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
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    const [globalRow] = await sequelize.query(
      `SELECT MIN(product_price)::numeric AS globalmin, MAX(product_price)::numeric AS globalmax FROM products p WHERE ${visibleProductSql('p')};`,
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

    const actualMin = parseFloat(filteredRow?.min) || 0;
    const actualMax = parseFloat(filteredRow?.max) || 0;

    res.json({
      min: snapMinToBreakpoint(priceBreakpoints, actualMin),
      max: snapMaxToBreakpoint(priceBreakpoints, actualMax),
      breakpoints: priceBreakpoints || [],
    });
  } catch (err) {
    next(err);
  }
};

module.exports.getProducts = async (req, res, next) => {
  try {
    const filters = extractFiltersFromQuery(req.query);
    console.log(chalk.blue('getProducts called with filters:'), filters);
    const limit = parseInt(req.query.limit, 10) || 27;
    const offset = parseInt(req.query.offset, 10) || 0;
    const catId = req.query.catId || null;
    
    // Determine sort field and direction
    // let sortField = 'product_price';
    // let sortDir = 'ASC';
    
    // if (req.query.sortBy === 'price_desc') {
    //   sortField = 'product_price';
    //   sortDir = 'DESC';
    // } else if (req.query.sortBy === 'most_popular') {
    //   sortField = 'most_popular';
    //   sortDir = 'DESC';
    // }

    // Default sort: most_popular DESC
    let sortField = 'most_popular';
    let sortDir = 'DESC';
    
    // Override if user selected a sort
    if (req.query.sortBy === 'price_asc') {
      sortField = 'product_price';
      sortDir = 'ASC';
    } else if (req.query.sortBy === 'price_desc') {
      sortField = 'product_price';
      sortDir = 'DESC';
    }

    const allFilterFields = await FilterField.findAll({ raw: true });

    const fieldIdMap = allFilterFields.reduce((acc, field) => {
      acc[field.field_name] = field.id;
      return acc;
    }, {});

    const built = buildFilterJoins({
      filters,
      allFilterFields,
      fieldIdMap,
    });

    let joinClauses = built.joinClauses;
    let whereClauses = built.whereClauses;
    const replacements = built.replacements;

    if (catId) {
      joinClauses = `
        JOIN product_categories pc
          ON pc.product_id = p.id
         AND pc.category_id = :catId
      ` + joinClauses;
      replacements.catId = catId;
    }

    const sql = `
      WITH filtered_product_ids AS (
        SELECT DISTINCT p.id
        FROM products p
        ${joinClauses}
        WHERE 1=1
        ${whereClauses}
        ${VISIBLE_PRODUCT_SQL_AND}
      )
      SELECT p.*
      FROM products p
      INNER JOIN filtered_product_ids fpi ON fpi.id = p.id
      WHERE ${visibleProductSql('p')}
      ORDER BY p.${sortField} ${sortDir}, p.id ASC
      LIMIT :limit OFFSET :offset
    `;

    const countSql = `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM products p
      ${joinClauses}
      WHERE 1=1
      ${whereClauses}
      ${VISIBLE_PRODUCT_SQL_AND}
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
    const catId = req.query.catId || null;
    
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
    
    // Add category filter if catId exists
    if (catId) {
      joins += `
        JOIN product_categories pc
          ON pc.product_id = p.id
         AND pc.category_id = :catId
      `;
      replacements.catId = catId;
    }

    for (const fieldName of Object.keys(req.query)) {
      if (META_QUERY_KEYS.has(fieldName)) continue;

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

    const widthField = filterMap['Display Width'];
    if (!widthField) throw new Error('Display Width filter field not found');
    // get filteredRow
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
      WHERE pf.filter_field_id = ${widthField.id};
      `,
      { replacements, type: QueryTypes.SELECT }
    );
    // get globalRow
    const [result] = await sequelize.query(
      `
      SELECT
        MIN(CAST(regexp_replace(pf.filter_value, '[^0-9\\.]+', '', 'g') AS double precision)) AS min,
        MAX(CAST(regexp_replace(pf.filter_value, '[^0-9\\.]+', '', 'g') AS double precision)) AS max
      FROM product_filters pf
      JOIN products p ON p.id = pf.product_id
      WHERE pf.filter_field_id = :widthFieldId
        AND ${visibleProductSql('p')}
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
    const catId = req.query.catId || null;
    
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
    
    // Add category filter if catId exists
    if (catId) {
      joins += `
        JOIN product_categories pc
          ON pc.product_id = p.id
         AND pc.category_id = :catId
      `;
      replacements.catId = catId;
    }

    for (const fieldName of Object.keys(req.query)) {
      if (META_QUERY_KEYS.has(fieldName)) continue;

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

    const heightField = filterMap['Display Height'];
    if (!heightField) throw new Error('Display Height filter field not found');

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
      WHERE pf.filter_field_id = ${heightField.id};
      `,
      { replacements, type: QueryTypes.SELECT }
    );
    const [result] = await sequelize.query(
      `
      SELECT
        MIN(CAST(regexp_replace(pf.filter_value, '[^0-9\\.]+', '', 'g') AS double precision)) AS min,
        MAX(CAST(regexp_replace(pf.filter_value, '[^0-9\\.]+', '', 'g') AS double precision)) AS max
      FROM product_filters pf
      JOIN products p ON p.id = pf.product_id
      WHERE pf.filter_field_id = :heightFieldId
        AND ${visibleProductSql('p')}
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
