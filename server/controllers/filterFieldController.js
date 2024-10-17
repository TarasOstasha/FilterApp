const createHttpError = require('http-errors')
const { FilterField } = require('../models')

module.exports.getAllFilterFields = async (req, res, next) => {
  //const { limit, offset } = req.pagination

  try {
    //const foundUsers = await User.getAll(limit, offset)
    const foundFilterFields = await FilterField.getAll();

    res.status(200).send(foundFilterFields);
  } catch (err) {
    next(err)
  }
}