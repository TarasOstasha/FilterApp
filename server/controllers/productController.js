const createHttpError = require('http-errors');
const chalk = require('chalk');
const { Product } = require('../models');

module.exports.getAllProducts = async (req, res, next) => {
  const { limit, offset } = req.pagination

  try {
    const foundProducts = await Product.getAll(limit, offset);

    res.status(200).send(foundProducts);
  } catch (err) {
    next(err);
  }
};

module.exports.getFilteredProducts = async(req, res, next) => {
  const { limit, offset } = req.pagination;
  // const { productType, graphicFinish, frameType, displayShape, displayHeight, displayWidth } = req.query;

  // try {
  //   const filteredProducts = await Product.getFilteredProducts(limit, offset, {
  //     productType,
  //     graphicFinish,
  //     frameType,
  //     displayShape,
  //     displayHeight,
  //     displayWidth
  //   });

  //   res.status(200).send(filteredProducts);
  const filters = req.query;

  try {
    const filteredProducts = await Product.getFilteredProducts(limit, offset, filters);
    const totalProducts = await Product.getTotalCount(filters); // Get total product count with filters

    res.status(200).json({
      products: filteredProducts,
      totalProducts: totalProducts, // Return total number of products
    });
  } catch (err) {
    next(err);
  }
};

// module.exports.getProducts = async (req, res, next) => {
//   const { limit, offset } = req.pagination;
//   const filters = req.query;
//   console.log(chalk.red(limit,offset,JSON.stringify(filters, null, 2)));
//   try {
//     let products, totalProducts;

//     // If filters are provided, use the filtered method
//     if (Object.keys(filters).length > 0) {
//       products = await Product.getFilteredProducts(limit, offset, filters);
//       totalProducts = await Product.getTotalCount(filters); // Get total count for filtered products
//     } else {
//       // No filters provided, get all products
//       products = await Product.getAll(limit, offset);
//       totalProducts = await Product.getTotalCount(); // Get total count for all products
//     }
//     console.log(products,totalProducts);
//     res.status(200).json({
//       products: products,
//       totalProducts: totalProducts, // Return total number of products, filtered or not
//     });
//   } catch (err) {
//     next(err);
//   }
// };

module.exports.getProducts = async (req, res, next) => {
  try {
    // Extract limit and offset from the query, and the remaining parameters are the filters
    const { limit, offset, sortBy, ...filteredParams } = req.query;
    // console.log(chalk.red(JSON.stringify(filteredParams)));
    let products, totalProducts;

    // If filters are provided, use the filtered method
    if (Object.keys(filteredParams).length > 0) {
      products = await Product.getFilteredProducts(limit, offset, filteredParams, sortBy); // Use filtered params
      totalProducts = await Product.getTotalCount(filteredParams); // Get total count for filtered products
    } else {
      // No filters provided, get all products
      products = await Product.getAll(limit, offset, sortBy);
      totalProducts = await Product.getTotalCount(); // Get total count for all products
      
    }

    // Log for debugging
    
    // Respond with products and total count
    res.status(200).json({
      products: products,
      totalProducts: totalProducts,
    });
  } catch (err) {
    next(err); // Forward error to the error handler middleware
  }
};

