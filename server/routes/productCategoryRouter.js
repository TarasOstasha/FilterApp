const { Router } = require('express');
const { productCategoryController } = require('../controllers');



const productCategoryRouter = Router();

productCategoryRouter
  .route('/')
  .get(productCategoryController.getAllProductCategories)
  //.post(usersController.createUser);






module.exports = productCategoryRouter;