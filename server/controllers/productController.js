const createHttpError = require('http-errors');
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
  const { productType, graphicFinish, frameType, displayShape, displayHeight, displayWidth } = req.query;

  try {
    const filteredProducts = await Product.getFilteredProducts(limit, offset, {
      productType,
      graphicFinish,
      frameType,
      displayShape,
      displayHeight,
      displayWidth
    });

    res.status(200).send(filteredProducts);
  } catch (err) {
    next(err);
  }
};