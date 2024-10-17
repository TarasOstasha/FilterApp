const createHttpError = require('http-errors')
const { ProductCategory } = require('../models')

module.exports.getAllProductCategories = async (req, res, next) => {
  //const { limit, offset } = req.pagination

  try {
    //const foundUsers = await User.getAll(limit, offset)
    const foundProductCategories = await ProductCategory.getAll();

    res.status(200).send(foundProductCategories);
  } catch (err) {
    next(err)
  }
}
