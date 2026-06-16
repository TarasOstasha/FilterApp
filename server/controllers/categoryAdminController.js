const createHttpError = require('http-errors');
const {
  getCategoryByCategoryId,
  createCategory,
  updateCategoryByCategoryId,
  deleteCategoryByCategoryId,
} = require('../services/categoryAdminService');

module.exports.getByCategoryId = async (req, res, next) => {
  try {
    const category = await getCategoryByCategoryId(req.params.categoryId);
    if (!category) {
      return next(createHttpError(404, 'Category not found'));
    }
    res.status(200).json({ category });
  } catch (error) {
    next(error.status ? error : createHttpError(500, 'Error fetching category'));
  }
};

module.exports.create = async (req, res, next) => {
  try {
    const category = await createCategory(req.body);
    res.status(201).json({
      message: 'Category created successfully',
      category,
    });
  } catch (error) {
    next(error.status ? error : createHttpError(500, 'Error creating category'));
  }
};

module.exports.updateByCategoryId = async (req, res, next) => {
  try {
    const category = await updateCategoryByCategoryId(req.params.categoryId, req.body);
    res.status(200).json({
      message: 'Category updated successfully',
      category,
    });
  } catch (error) {
    next(error.status ? error : createHttpError(500, 'Error updating category'));
  }
};

module.exports.deleteByCategoryId = async (req, res, next) => {
  try {
    const result = await deleteCategoryByCategoryId(req.params.categoryId);
    res.status(200).json({
      message: 'Category removed successfully',
      result,
    });
  } catch (error) {
    next(error.status ? error : createHttpError(500, 'Error removing category'));
  }
};
