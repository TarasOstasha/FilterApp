const createHttpError = require('http-errors')
const chalk = require('chalk')
const { Product, Category, FilterField } = require('../models')
const { Op } = require('sequelize');

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

//     // Otherwise, build the filter logic
//     const where = {};   // for direct Product columns
//     const include = []; // for Category / FilterField associations

//     // 1) Handle category_name (if present)
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
//         required: true, // Inner join
//       });

//       delete filters.category_name;
//     }

//     // 2) Handle other filters that might map to FilterField
//     // For example: ?boothSize=Large or ?frameType=Metal => boothSize/frameType are `field_name`, "Large"/"Metal" are `filter_value`.
//     const filterFieldConditions = [];
//     let hasFilterField = false;

//     Object.entries(filters).forEach(([fieldName, rawValue]) => {
//       let values = Array.isArray(rawValue)
//         ? rawValue
//         : rawValue.split(',');
//       values = values.map((v) => v.trim());

//       filterFieldConditions.push({
//         field_name: fieldName,
//         filter_value: { [Op.in]: values },
//       });
//       hasFilterField = true;
//     });

//     if (hasFilterField) {
//       include.push({
//         model: FilterField,
//         where: {
//           [Op.or]: filterFieldConditions.map((cond) => ({
//             field_name: cond.field_name,
//           })),
//         },
//         through: {
//           attributes: [], // We don't need pivot columns in the result
//           where: {
//             [Op.or]: filterFieldConditions.map((cond) => ({
//               filter_value: cond.filter_value,
//             })),
//           },
//         },
//         required: true,
//       });
//     }

//     // 3) Run the query with the built-up `where` and `include`
//     const products = await Product.findAll({
//       where,
//       include,
//       limit: parsedLimit,
//       offset: parsedOffset,
//       order: [order],
//       //distinct: true, // avoid duplicates
//     });

//     // 4) Count matching rows for pagination
//     const totalProducts = await Product.count({
//       where,
//       include,
//       //distinct: true,
//     });

//     // 5) Optional: deduplicate final result if still needed
//     const uniqueProducts = Array.from(
//       new Map(products.map((p) => [p.id, p])).values()
//     );

//     res.status(200).json({
//       products: uniqueProducts,
//       totalProducts,
//     });
//   } catch (err) {
//     next(err);
//   }
// };



module.exports.getProducts = async (req, res, next) => {
  try {
    // Extract pagination & query params
    const {
      limit = 27,
      offset = 0,
      sortBy = 'price_asc',
      ...filters
    } = req.query;

    // Convert limit/offset to numbers
    const parsedLimit = parseInt(limit, 10) || 10;
    const parsedOffset = parseInt(offset, 10) || 0;

    // Build an ORDER array for sorting
    const sortOptions = {
      price_asc: ['product_price', 'ASC'],
      price_desc: ['product_price', 'DESC'],
      name_asc: ['product_name', 'ASC'],
      name_desc: ['product_name', 'DESC'],
    };
    const order = sortOptions[sortBy] || ['product_price', 'ASC'];
    console.log(chalk.red(order, '<< sort order for getProducts'));

    // If no filters are provided, fetch all products unfiltered
    if (Object.keys(filters).length === 0) {
      const products = await Product.findAll({
        limit: parsedLimit,
        offset: parsedOffset,
        order: [order],
      });
      const totalProducts = await Product.count();

      return res.status(200).json({
        products,
        totalProducts,
      });
    }

    // We'll build "where" for direct columns if needed (like price, etc.)
    const where = {};

    // We'll build "include" for associations (Category, FilterField)
    const include = [];

    // 1) If you have a "category_name" filter, handle it separately
    if (filters.category_name) {
      let categoryValues = Array.isArray(filters.category_name)
        ? filters.category_name
        : filters.category_name.split(',');
      categoryValues = categoryValues.map((v) => v.trim());

      include.push({
        model: Category,
        where: {
          category_name: { [Op.in]: categoryValues },
        },
        required: true, // must match category
      });

      delete filters.category_name;
    }

    // 2) Handle all other filters as FilterField includes
    //    Each distinct field => one "include" => AND logic across fields
    for (const [fieldName, rawValue] of Object.entries(filters)) {
      // rawValue might be a string like "Kit" or "SEG (Fabric),Velcro (Fabric)"
      const values = Array.isArray(rawValue)
        ? rawValue
        : rawValue.split(',').map((v) => v.trim());

      // This create a separate "include" for each field
      include.push({
        model: FilterField,
        // If you used `as: 'FilterFields'` in your Product model, specify `as` here too
        where: {
          field_name: fieldName, // e.g. "Product Details"
        },
        through: {
          attributes: [],
          where: {
            filter_value: { [Op.in]: values }, // OR logic within that field's checkboxes
          },
        },
        required: true, // must match this field => AND logic
      });
    }

    // 3) Run the query with the built-up "where" (for direct columns) and "include"
    const products = await Product.findAll({
      where,
      include,
      limit: parsedLimit,
      offset: parsedOffset,
      order: [order],
      distinct: true, // helps avoid duplicates if a product matches multiple values
    });

    // 4) Count matching rows for pagination
    const totalProducts = await Product.count({
      where,
      include,
      distinct: true,
    });

    // 5) Optionally deduplicate final result if needed
    const uniqueProducts = Array.from(
      new Map(products.map((p) => [p.id, p])).values()
    );

    return res.status(200).json({
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
