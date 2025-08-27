const createHttpError = require('http-errors')
const { FilterField } = require('../models');
const chalk = require('chalk');

module.exports.getAllFilterFields = async (req, res, next) => {

  try {
    const foundFilterFields = await FilterField.findAll({
      order: [['sort_order', 'ASC']],
    });
    //console.log(chalk.blue('Found filter fields:'), foundFilterFields);
    // i'm modifying data here becaouse i need allowed_values be array of string
    const modifiedFilterFields = foundFilterFields.map((field) => {
      return {
        ...field.dataValues,
        allowed_values: typeof field.dataValues.allowed_values === 'string'
          ? field.dataValues.allowed_values.split(',').map((val) => val.trim())
          : field.dataValues.allowed_values,
      };
    });
    res.status(200).send(modifiedFilterFields);
  } catch (err) {
    next(err)
  }
}