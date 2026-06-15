const createHttpError = require('http-errors');
const {
  getProductByCode,
  updateProductByCode,
  deleteProductByCode,
} = require('../services/productAdminService');

module.exports.getByCode = async (req, res, next) => {
  try {
    const product = await getProductByCode(req.params.productCode);
    if (!product) {
      return next(createHttpError(404, 'Product not found'));
    }
    res.status(200).json({ product });
  } catch (error) {
    next(error.status ? error : createHttpError(500, 'Error fetching product'));
  }
};

module.exports.updateByCode = async (req, res, next) => {
  try {
    const product = await updateProductByCode(req.params.productCode, req.body);
    res.status(200).json({
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    next(error.status ? error : createHttpError(500, 'Error updating product'));
  }
};

module.exports.deleteByCode = async (req, res, next) => {
  try {
    const result = await deleteProductByCode(req.params.productCode);
    if (!result) {
      return next(createHttpError(404, 'Product not found'));
    }
    res.status(200).json({
      message: 'Product removed successfully',
      result,
    });
  } catch (error) {
    next(error.status ? error : createHttpError(500, 'Error removing product'));
  }
};
