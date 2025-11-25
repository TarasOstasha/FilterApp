const createHttpError = require('http-errors')
//const { ProductCategory } = require('../models')

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


module.exports.importProductCategories = async (req, res, next) => {
  if (!req.file) {
      return next(createHttpError(400, 'No file uploaded or invalid file format (only .csv allowed)'));
  }
  try {
      const results = await processProductCategoriesCsvFile(req.file.path);
      if (results.errorRows && results.errorRows.length > 0) {
          res.status(400).json({
              message: `File processed with errors. ${results.errorRows.length} rows had issues.`,
              errorRows: results.errorRows
          });
      } else {
          res.status(200).json({ message: 'File processed successfully' });
      }
  } catch (err) {
      next(createHttpError(500, 'Error processing file'));
  }
}