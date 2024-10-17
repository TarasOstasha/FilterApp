const { Router } = require('express');
const { categoryController } = require('../controllers');


// app.get('/category', categoryController.getAllCategories);

const categoryRouter = Router();
categoryRouter
    .route('/')
    .get(categoryController.getAllCategories)




module.exports = categoryRouter;