const { Router } = require('express');
const { paginate } = require('../middleware');
const { productController } = require('../controllers');

// app.get('/products', paginate.paginateProducts, productController.getAllProducts);

const productRouter = Router();

productRouter
    .route('/')
    //.get(paginate.paginateProducts, productController.getAllProducts)
    .get(paginate.paginateProducts, productController.getProducts)


module.exports = productRouter;