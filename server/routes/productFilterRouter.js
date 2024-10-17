const { Router } = require('express');
const { productFilterController } = require('../controllers');





const productFilterRouter = Router();

productFilterRouter
  .route('/')
  .get(productFilterController.getAllProductFilters)
  //.post(usersController.createUser);











module.exports = productFilterRouter;