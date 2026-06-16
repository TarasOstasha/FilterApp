const createHttpError = require('http-errors');
const {
  getFilterFieldById,
  createFilterField,
  updateFilterFieldById,
  deleteFilterFieldById,
} = require('../services/filterFieldAdminService');

module.exports.getById = async (req, res, next) => {
  try {
    const filterField = await getFilterFieldById(req.params.id);
    if (!filterField) {
      return next(createHttpError(404, 'Filter field not found'));
    }
    res.status(200).json({ filter_field: filterField });
  } catch (error) {
    next(error.status ? error : createHttpError(500, 'Error fetching filter field'));
  }
};

module.exports.create = async (req, res, next) => {
  try {
    const filterField = await createFilterField(req.body);
    res.status(201).json({
      message: 'Filter field created successfully',
      filter_field: filterField,
    });
  } catch (error) {
    next(error.status ? error : createHttpError(500, 'Error creating filter field'));
  }
};

module.exports.updateById = async (req, res, next) => {
  try {
    const filterField = await updateFilterFieldById(req.params.id, req.body);
    res.status(200).json({
      message: 'Filter field updated successfully',
      filter_field: filterField,
    });
  } catch (error) {
    next(error.status ? error : createHttpError(500, 'Error updating filter field'));
  }
};

module.exports.deleteById = async (req, res, next) => {
  try {
    const result = await deleteFilterFieldById(req.params.id);
    res.status(200).json({
      message: 'Filter field removed successfully',
      result,
    });
  } catch (error) {
    next(error.status ? error : createHttpError(500, 'Error removing filter field'));
  }
};
