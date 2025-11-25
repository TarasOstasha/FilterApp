const createHttpError = require('http-errors')
const { Category } = require('../models')

module.exports.getAllCategories = async (req, res, next) => {
  //const { limit, offset } = req.pagination

  try {
    //const foundUsers = await User.getAll(limit, offset)
    const foundCategories = await Category.getAll();

    res.status(200).send(foundCategories);
  } catch (err) {
    next(err)
  }
}
