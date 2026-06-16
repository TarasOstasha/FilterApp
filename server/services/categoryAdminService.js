const createHttpError = require('http-errors');
const { Category } = require('../models');

const parseCategoryId = (raw) => {
  const categoryId = parseInt(String(raw || '').trim(), 10);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw createHttpError(400, 'Valid category ID is required');
  }
  return categoryId;
};

const toAdminCategory = (category) => ({
  category_id: category.category_id,
  category_name: category.category_name,
});

async function getCategoryByCategoryId(rawCategoryId) {
  const categoryId = parseCategoryId(rawCategoryId);
  const category = await Category.findOne({
    where: { category_id: categoryId },
    raw: true,
  });
  return category ? toAdminCategory(category) : null;
}

async function createCategory(payload) {
  if (payload.category_id === undefined || payload.category_id === null || String(payload.category_id).trim() === '') {
    throw createHttpError(400, 'category_id is required');
  }

  const categoryId = parseCategoryId(payload.category_id);
  const categoryName = String(payload.category_name || '').trim();
  if (!categoryName) {
    throw createHttpError(400, 'category_name is required');
  }

  const existing = await Category.findOne({ where: { category_id: categoryId } });
  if (existing) {
    throw createHttpError(409, `Category ID ${categoryId} already exists`);
  }

  const created = await Category.create({
    category_id: categoryId,
    category_name: categoryName,
  });

  return toAdminCategory(created.get({ plain: true }));
}

async function updateCategoryByCategoryId(rawCategoryId, payload) {
  const categoryId = parseCategoryId(rawCategoryId);
  const existing = await Category.findOne({ where: { category_id: categoryId } });
  if (!existing) {
    throw createHttpError(404, `Category not found: ${categoryId}`);
  }

  const categoryName = String(payload.category_name || '').trim();
  if (!categoryName) {
    throw createHttpError(400, 'category_name is required');
  }

  await existing.update({ category_name: categoryName });
  return toAdminCategory(existing.get({ plain: true }));
}

async function deleteCategoryByCategoryId(rawCategoryId) {
  const categoryId = parseCategoryId(rawCategoryId);
  const existing = await Category.findOne({ where: { category_id: categoryId } });
  if (!existing) {
    throw createHttpError(404, `Category not found: ${categoryId}`);
  }

  const result = {
    category_id: existing.category_id,
    category_name: existing.category_name,
  };

  await existing.destroy();
  return result;
}

module.exports = {
  getCategoryByCategoryId,
  createCategory,
  updateCategoryByCategoryId,
  deleteCategoryByCategoryId,
};
