const createHttpError = require('http-errors')
const { ProductFilter } = require('../models')

module.exports.getAllProductFilters = async (req, res, next) => {
  //const { limit, offset } = req.pagination
  console.log('click!');
  try {
    //const foundUsers = await User.getAll(limit, offset)
    const foundProductFilters = await ProductFilter.getAll();

    res.status(200).send(foundProductFilters);
  } catch (err) {
    next(err)
  }
}
