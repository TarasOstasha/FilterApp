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
}