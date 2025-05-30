const createHttpError = require('http-errors')
const chalk = require('chalk')
const { Product, Category, FilterField } = require('../models')
const { Op, fn, col, where, cast } = require('sequelize');

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

// 1 old
// module.exports.getProducts = async (req, res, next) => {
//   try {
//     // Extract pagination & query params
//     const {
//       limit = 27,
//       offset = 0,
//       sortBy = 'price_asc',
//       ...filters
//     } = req.query;

//     // Convert limit/offset to numbers
//     const parsedLimit = parseInt(limit, 10) || 10;
//     const parsedOffset = parseInt(offset, 10) || 0;

//     // Build an ORDER array for sorting
//     const sortOptions = {
//       price_asc: ['product_price', 'ASC'],
//       price_desc: ['product_price', 'DESC'],
//       name_asc: ['product_name', 'ASC'],
//       name_desc: ['product_name', 'DESC'],
//     };
//     const order = sortOptions[sortBy] || ['product_price', 'ASC'];
//     console.log(chalk.red(order, '<< sort order for getProducts'));

//     // If no filters are provided, fetch all products unfiltered
//     if (Object.keys(filters).length === 0) {
//       const products = await Product.findAll({
//         limit: parsedLimit,
//         offset: parsedOffset,
//         order: [order],
//       });
//       const totalProducts = await Product.count();

//       return res.status(200).json({
//         products,
//         totalProducts,
//       });
//     }

//     // We'll build "where" for direct columns if needed (like price, etc.)
//     const where = {};

//     // We'll build "include" for associations (Category, FilterField)
//     const include = [];

//     // 1) If you have a "category_name" filter, handle it separately
//     if (filters.category_name) {
//       let categoryValues = Array.isArray(filters.category_name)
//         ? filters.category_name
//         : filters.category_name.split(',');
//       categoryValues = categoryValues.map((v) => v.trim());

//       include.push({
//         model: Category,
//         where: {
//           category_name: { [Op.in]: categoryValues },
//         },
//         required: true, // must match category
//       });

//       delete filters.category_name;
//     }

//     // 2) Handle all other filters as FilterField includes
//     //    Each distinct field => one "include" => AND logic across fields
//     for (const [fieldName, rawValue] of Object.entries(filters)) {
//       // rawValue might be a string like "Kit" or "SEG (Fabric),Velcro (Fabric)"
//       const values = Array.isArray(rawValue)
//         ? rawValue
//         : rawValue.split(',').map((v) => v.trim());

//       // This create a separate "include" for each field
//       include.push({
//         model: FilterField,
//         // If you used `as: 'FilterFields'` in your Product model, specify `as` here too
//         where: {
//           field_name: fieldName, // e.g. "Product Details"
//         },
//         through: {
//           attributes: [],
//           where: {
//             filter_value: { [Op.in]: values }, // OR logic within that field's checkboxes
//           },
//         },
//         required: true, // must match this field => AND logic
//       });
//     }

//     // 3) Run the query with the built-up "where" (for direct columns) and "include"
//     const products = await Product.findAll({
//       where,
//       include,
//       limit: parsedLimit,
//       offset: parsedOffset,
//       order: [order],
//       distinct: true, // helps avoid duplicates if a product matches multiple values
//     });

//     // 4) Count matching rows for pagination
//     const totalProducts = await Product.count({
//       where,
//       include,
//       distinct: true,
//     });

//     // 5) Optionally deduplicate final result if needed
//     const uniqueProducts = Array.from(
//       new Map(products.map((p) => [p.id, p])).values()
//     );

//     return res.status(200).json({
//       products: uniqueProducts,
//       totalProducts,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// 2
// module.exports.getProducts = async (req, res, next) => {
//   try {
//     // 1) Extract top-level query params
//     const {
//       limit = 27,
//       offset = 0,
//       sortBy = 'price_asc',
//       ...filters
//     } = req.query;
//     console.log(chalk.yellow(JSON.stringify(req.query),': req.query'));
//     // Convert limit/offset to numbers
//     const parsedLimit = parseInt(limit, 10) || 10;
//     const parsedOffset = parseInt(offset, 10) || 0;

//     // Build order array for sorting
//     const sortOptions = {
//       price_asc: ['product_price', 'ASC'],
//       price_desc: ['product_price', 'DESC'],
//       name_asc: ['product_name', 'ASC'],
//       name_desc: ['product_name', 'DESC'],
//     };
//     const order = sortOptions[sortBy] || ['product_price', 'ASC'];
//     console.log(chalk.red(order, '<< sort order for getProducts'));

//     // We'll build "where" for direct numeric columns (like product_price)
//     const where = {};

//     // mapping from "Product Price" => product_price, "Display Width" => product_width...
//     const numericRanges = {
//       'Product Price': 'product_price',
//       'Display Width': 'product_width',
//       'Display Height': 'product_height',
//     };

//     // For each known numeric field, parse "min,max" if present in `filters`
//     for (const [paramName, columnName] of Object.entries(numericRanges)) {
//       if (filters[paramName]) {
//         // e.g. filters["Product Price"] = "0,98625" or an array like ["0,98625"]
//         const raw = filters[paramName];
//         const rangeString = Array.isArray(raw) ? raw[0] : raw; // We only expect one e.g. "0,98625"
//         const [minStr, maxStr] = rangeString.split(',');
//         const min = parseFloat(minStr) || 0;
//         const max = parseFloat(maxStr) || 9999999; // or a big default

//         // Build a where clause: product_price BETWEEN min AND max
//         where[columnName] = { [Op.between]: [min, max] };

//         // Remove it from `filters` so it doesn't go to the FilterField logic
//         delete filters[paramName];
//       }
//     }

//     // If no filters left after removing numeric ranges, maybe just fetch unfiltered
//     const hasRemainingFilters = Object.keys(filters).length > 0;

//     // Build "include" for associations (Category, FilterField)
//     const include = [];

//     // If we have a category_name param, handle it separately
//     if (filters.category_name) {
//       let categoryValues = Array.isArray(filters.category_name)
//         ? filters.category_name
//         : filters.category_name.split(',');
//       categoryValues = categoryValues.map((v) => v.trim());

//       include.push({
//         model: Category,
//         where: { category_name: { [Op.in]: categoryValues } },
//         required: true,
//       });

//       delete filters.category_name;
//     }

//     // For any remaining filters, treat them as FilterField => each field => one include
//     for (const [fieldName, rawValue] of Object.entries(filters)) {
//       // e.g. "Graphic Finish" => "SEG (Fabric),Velcro (Fabric)"
//       const values = Array.isArray(rawValue)
//         ? rawValue
//         : rawValue.split(',').map((v) => v.trim());

//       include.push({
//         model: FilterField,
//         where: { field_name: fieldName },
//         through: {
//           attributes: [],
//           where: { filter_value: { [Op.in]: values } },
//         },
//         required: true,
//       });
//     }

//     // Now run the main query
//     const products = await Product.findAll({
//       where,             // numeric columns
//       include,           // category / filterfield associations
//       limit: parsedLimit,
//       offset: parsedOffset,
//       order: [order],
//       distinct: true,    // avoid duplicates
//     });

//     // Count matching rows for pagination
//     const totalProducts = await Product.count({
//       where,
//       include,
//       distinct: true,
//     });

//     // Deduplicate final results if needed
//     const uniqueProducts = Array.from(new Map(products.map((p) => [p.id, p])).values());

//     return res.status(200).send({
//       products: uniqueProducts,
//       totalProducts,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

module.exports.getProducts = async (req, res, next) => {
  try {
    const {
      limit = 27,
      offset = 0,
      sortBy = 'price_asc',
      ...filters
    } = req.query;

    const parsedLimit = parseInt(limit, 10) || 10;
    const parsedOffset = parseInt(offset, 10) || 0;

    const sortOptions = {
      price_asc: ['product_price', 'ASC'],
      price_desc: ['product_price', 'DESC'],
      name_asc: ['product_name', 'ASC'],
      name_desc: ['product_name', 'DESC'],
    };
    const order = sortOptions[sortBy] || ['product_price', 'ASC'];

    const whereClause = {};
    const include = [];

    // Normalize frontend label names to DB field_name
    const labelAlias = {
      'Display Width': 'Display Width Ft',
      'Display Height': 'Display Height Ft',
      'Width': 'Display Width Ft',
      'Height': 'Display Height Ft',
      'Price': 'Product Price',
    };

    for (const key in filters) {
      if (labelAlias[key]) {
        filters[labelAlias[key]] = filters[key];
        delete filters[key];
      }
    }

    // Load filter field definitions
    const allFilterFields = await FilterField.findAll({
      attributes: ['id', 'field_name', 'field_type']
    });

    const fieldNameToId = {};
    const rangeFieldNames = new Set();

    allFilterFields.forEach(field => {
      fieldNameToId[field.field_name] = field.id;
      if (field.field_type === 'range') {
        rangeFieldNames.add(field.field_name);
      }
    });

    // Handle Product Price (direct column)
    if (filters['Product Price']) {
      const raw = Array.isArray(filters['Product Price']) ? filters['Product Price'][0] : filters['Product Price'];
      const [minStr, maxStr] = raw.split(',');
      const min = parseFloat(minStr) || 0;
      const max = parseFloat(maxStr) || 9999999;

      whereClause['product_price'] = { [Op.between]: [min, max] };
      delete filters['Product Price'];
    }

    // Handle range-type filters from product_filters table
    for (const [paramName, rawValue] of Object.entries(filters)) {
      if (rangeFieldNames.has(paramName)) {
        const fieldId = fieldNameToId[paramName];
        const rangeStr = Array.isArray(rawValue) ? rawValue[0] : rawValue;
        const [minStr, maxStr] = rangeStr.split(',');
        const min = parseFloat(minStr) || 0;
        const max = parseFloat(maxStr) || 9999999;

        include.push({
          model: FilterField,
          where: { id: fieldId },
          through: {
            attributes: [],
            where: where(
              cast(col('filter_value'), 'double precision'),
              {
                [Op.and]: [
                  { [Op.gte]: min },
                  { [Op.lte]: max }
                ]
              }
            )
          },
          required: true
        });

        delete filters[paramName];
      }
    }

    // Handle category_name
    if (filters.category_name) {
      let categoryValues = Array.isArray(filters.category_name)
        ? filters.category_name
        : filters.category_name.split(',');
      categoryValues = categoryValues.map((v) => v.trim());

      include.push({
        model: Category,
        where: { category_name: { [Op.in]: categoryValues } },
        required: true,
      });

      delete filters.category_name;
    }

    // Handle checkbox-type filters (remaining)
    for (const [fieldName, rawValue] of Object.entries(filters)) {
      const values = Array.isArray(rawValue)
        ? rawValue
        : rawValue.split(',').map((v) => v.trim());

      include.push({
        model: FilterField,
        where: { field_name: fieldName },
        through: {
          attributes: [],
          where: {
            filter_value: { [Op.in]: values },
          },
        },
        required: true,
      });
    }

    // Final query
    const products = await Product.findAll({
      where: whereClause,
      include,
      limit: parsedLimit,
      offset: parsedOffset,
      order: [order],
      distinct: true,
    });

    const totalProducts = await Product.count({
      where: whereClause,
      include,
      distinct: true,
    });

    const uniqueProducts = Array.from(new Map(products.map(p => [p.id, p])).values());

    res.status(200).send({
      products: uniqueProducts,
      totalProducts,
    });
  } catch (err) {
    next(err);
  }
};



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
