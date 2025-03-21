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

// module.exports.getFilteredProducts = async (req, res, next) => {
//   // Extract pagination from middleware or query
//   const { limit, offset } = req.pagination || { limit: 10, offset: 0 };
//   // Extract filters from query
//   const filters = { ...req.query }; // e.g. { category_name: 'Displays', boothSize: 'Large' }
//   // Extract optional sort param
//   let { sortBy = 'price_asc' } = req.query;

//   try {
//     // 1) Build sorting
//     const sortOptions = {
//       price_asc: ['product_price', 'ASC'],
//       price_desc: ['product_price', 'DESC'],
//       name_asc: ['product_name', 'ASC'],
//       name_desc: ['product_name', 'DESC'],
//     };
//     let order = sortOptions[sortBy] || ['product_price', 'ASC'];
//     console.log(chalk.red(order, 'getFilteredProducts'));
//     // 2) Prepare "where" for Product and "include" array for associations
//     const where = {};     // For direct Product columns
//     const include = [];    // For Category / FilterField

//     // 3) Handle category_name filters
//     if (filters.category_name) {
//       // Could be a single string or comma-separated
//       let categoryValues = Array.isArray(filters.category_name)
//         ? filters.category_name
//         : filters.category_name.split(',');

//       // Trim spaces
//       categoryValues = categoryValues.map((v) => v.trim());

//       include.push({
//         model: Category,
//         // If you used `as: 'Categories'`, then `as: 'Categories'` here
//         where: {
//           category_name: { [Op.in]: categoryValues },
//         },
//         // 'required: true' means an inner join
//         required: true,
//       });

//       delete filters.category_name; // remove so we don't handle it twice
//     }

//     // 4) Handle other filters that rely on FilterField + product_filters
//     // Example: user might pass ?boothSize=Large or ?frameType=Metal
//     // We'll assume the user passes them as "boothSize=Large" -> boothSize is the field_name, Large is the filter_value
//     // If you have multiple, you can do them all in a single "include" by building conditions in "through: { where: ... }" or multiple includes.

//     // We'll do a simple approach: For each key in filters, we treat it as a filterField name
//     // and the query param as the filter_value(s).
//     const filterFieldConditions = []; // each item is { field_name: <>, filter_value: [Op.in] <[]> }
//     let hasFilterField = false;

//     Object.entries(filters).forEach(([fieldName, rawValue]) => {
//       // e.g. fieldName = "boothSize", rawValue = "Large,XL"
//       let values = Array.isArray(rawValue)
//         ? rawValue
//         : rawValue.split(',');
//       values = values.map((v) => v.trim());

//       // We'll store an object representing this filter
//       filterFieldConditions.push({
//         field_name: fieldName,
//         filter_value: { [Op.in]: values },
//       });
//       hasFilterField = true;
//     });

//     if (hasFilterField) {
//       // We'll include FilterField with a "through" where condition
//       include.push({
//         model: FilterField,
//         // If you used `as: 'FilterFields'`, specify it
//         // We'll match multiple filters by [Op.or] or [Op.and] depending on your logic
//         // For "OR" across different field_names, you might do multiple includes or advanced logic.
//         // For a simpler approach, let's do "AND" across all filters => each must match one of them.
//         // That typically means multiple includes, but let's show one approach:

//         // We can't do multiple "where" objects in a single include if they have different field_names.
//         // So, if you want "AND" logic across multiple filter fields, you might do multiple includes dynamically.
//         // But let's do a simpler "OR" approach for demonstration:
//         where: {
//           [Op.or]: filterFieldConditions.map((cond) => ({
//             field_name: cond.field_name,
//           })),
//         },
//         // Now we also need a "through" condition for filter_value
//         // But we have multiple possible values for each field_name. We'll do a custom approach:
//         through: {
//           attributes: [], // we don't need columns from the pivot
//           where: {
//             [Op.or]: filterFieldConditions.map((cond) => ({
//               filter_value: cond.filter_value,
//             })),
//           },
//         },
//         required: true,
//       });
//     }

//     // 5) Query with Sequelize
//     const products = await Product.findAll({
//       where,
//       include,
//       limit: parseInt(limit, 10) || 10,
//       offset: parseInt(offset, 10) || 0,
//       order: [order],
//       distinct: true, // ensure distinct product rows
//     });

//     // Count how many total (for pagination)
//     const totalProducts = await Product.count({
//       where,
//       include,
//       distinct: true,
//     });

//     // 6) Remove duplicates if you want, or rely on distinct: true
//     // If you still get duplicates, you can do the unique trick:
//     const uniqueProducts = Array.from(
//       new Map(products.map((p) => [p.id, p])).values()
//     );

//     res.status(200).send({
//       products: uniqueProducts,
//       totalProducts,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// module.exports.getProducts = async (req, res, next) => {
  
//   try {
//     // Extract query params
//     const {
//       limit = 10,
//       offset = 0,
//       sortBy = 'price_asc',
//       ...filteredParams
//     } = req.query;

//     // Convert limit/offset to numbers
//     const parsedLimit = parseInt(limit, 10) || 10;
//     const parsedOffset = parseInt(offset, 10) || 0;

//     // Build an ORDER array for sorting
//     // e.g. 'price_asc' => ['product_price', 'ASC']
//     let order;
//     switch (sortBy) {
//       case 'price_desc':
//         order = [['product_price', 'DESC']];
//         break;
//       case 'price_asc':
//         order = [['product_price', 'ASC']];
//         break;
//       case 'name_asc':
//         order = [['product_name', 'ASC']];
//         break;
//       case 'name_desc':
//         order = [['product_name', 'DESC']];
//         break;
//       default:
//         order = [['product_price', 'ASC']]; // fallback
//     }
    
//     // If no filters provided, just fetch all products
//     if (Object.keys(filteredParams).length === 0) {
//       const products = await Product.findAll({
//         limit: parsedLimit,
//         offset: parsedOffset,
//         order,
//       });
//       const totalProducts = await Product.count();

//       return res.status(200).json({
//         products,
//         totalProducts,
//       });
//     }

//     // Otherwise, handle filters. For example:
//     // If "category_name" is passed, we can filter by Category
//     // If "someFilter" is passed, we might filter by FilterField, etc.
//     // We'll build an "include" array dynamically.

//     const include = [];
//     const where = {}; // For direct filters on Product itself

//     // Example: if user passes category_name=Display, we filter on Category
//     if (filteredParams.category_name) {
//       // Could be a single string or multiple comma-separated
//       const categories = Array.isArray(filteredParams.category_name)
//         ? filteredParams.category_name
//         : filteredParams.category_name.split(',');

//       include.push({
//         model: Category,
//         // alias: 'Categories', // if you used `as: 'Categories'`
//         where: {
//           category_name: { [Op.in]: categories.map((c) => c.trim()) },
//         },
//       });

//       delete filteredParams.category_name; // remove it so we don't double-handle
//     }

//     // Example: if user passes filter_field=Something
//     // we can filter on FilterField or filter_value. 
//     // Suppose the param name is "field_name" or something:
//     if (filteredParams.field_name) {
//       const fields = Array.isArray(filteredParams.field_name)
//         ? filteredParams.field_name
//         : filteredParams.field_name.split(',');

//       include.push({
//         model: FilterField,
//         // alias: 'FilterFields',
//         where: {
//           field_name: { [Op.in]: fields.map((f) => f.trim()) },
//         },
//       });

//       delete filteredParams.field_name;
//     }

//     // If you have more custom filters (like product_price min/max),
//     // you can put them in "where" on Product directly. For example:
//     if (filteredParams.minPrice) {
//       where.product_price = { [Op.gte]: filteredParams.minPrice };
//       delete filteredParams.minPrice;
//     }
//     if (filteredParams.maxPrice) {
//       where.product_price = {
//         ...(where.product_price || {}),
//         [Op.lte]: filteredParams.maxPrice,
//       };
//       delete filteredParams.maxPrice;
//     }

//     // Now do the query with dynamic "include" and "where"
//     const products = await Product.findAll({
//       where,
//       include,
//       limit: parsedLimit,
//       offset: parsedOffset,
//       order,
//       distinct: true, // ensures we get distinct rows if we join
//     });

//     // Count how many total match the same filters
//     const totalProducts = await Product.count({
//       where,
//       include,
//       distinct: true,
//     });
    
//     // If you still want to deduplicate at the end, you can do that:
//     const uniqueProducts = Array.from(
//       new Map(products.map((p) => [p.id, p])).values()
//     );
    
//     res.status(200).send({
//       products: uniqueProducts,
//       totalProducts,
//     });
//   } catch (err) {
//     next(err);
//   }
// };


// controllers/productController.js


module.exports.getProducts = async (req, res, next) => {
  try {
    // Extract pagination & query params
    const {
      limit = 27,
      offset = 0,
      sortBy = 'price_asc',
      ...filters
    } = req.query;
    console.log(chalk.yellow(limit, offset, sortBy, 'REQ QUERY'));
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

    // Otherwise, build the filter logic
    const where = {};   // for direct Product columns
    const include = []; // for Category / FilterField associations

    // 1) Handle category_name (if present)
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
        required: true, // Inner join
      });

      delete filters.category_name;
    }

    // 2) Handle other filters that might map to FilterField
    // For example: ?boothSize=Large or ?frameType=Metal => boothSize/frameType are `field_name`, "Large"/"Metal" are `filter_value`.
    const filterFieldConditions = [];
    let hasFilterField = false;

    Object.entries(filters).forEach(([fieldName, rawValue]) => {
      let values = Array.isArray(rawValue)
        ? rawValue
        : rawValue.split(',');
      values = values.map((v) => v.trim());

      filterFieldConditions.push({
        field_name: fieldName,
        filter_value: { [Op.in]: values },
      });
      hasFilterField = true;
    });

    if (hasFilterField) {
      include.push({
        model: FilterField,
        where: {
          [Op.or]: filterFieldConditions.map((cond) => ({
            field_name: cond.field_name,
          })),
        },
        through: {
          attributes: [], // We don't need pivot columns in the result
          where: {
            [Op.or]: filterFieldConditions.map((cond) => ({
              filter_value: cond.filter_value,
            })),
          },
        },
        required: true,
      });
    }

    // 3) Run the query with the built-up `where` and `include`
    const products = await Product.findAll({
      where,
      include,
      limit: parsedLimit,
      offset: parsedOffset,
      order: [order],
      //distinct: true, // avoid duplicates
    });

    // 4) Count matching rows for pagination
    const totalProducts = await Product.count({
      where,
      include,
      //distinct: true,
    });

    // 5) Optional: deduplicate final result if still needed
    const uniqueProducts = Array.from(
      new Map(products.map((p) => [p.id, p])).values()
    );

    res.status(200).json({
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
