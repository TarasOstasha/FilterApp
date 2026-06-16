const { Router } = require('express');
const { categoryController, categoryAdminController } = require('../controllers');


// app.get('/category', categoryController.getAllCategories);

const categoryRouter = Router();
categoryRouter
    .route('/')
    .get(categoryController.getAllCategories)
    .post(categoryAdminController.create);

categoryRouter
    .route('/by-category-id/:categoryId')
    .get(categoryAdminController.getByCategoryId)
    .put(categoryAdminController.updateByCategoryId)
    .delete(categoryAdminController.deleteByCategoryId);




module.exports = categoryRouter;