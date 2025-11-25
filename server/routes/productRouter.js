const { Router } = require('express');
const { paginate } = require('../middleware');
const { productController } = require('../controllers');

// app.get('/products', paginate.paginateProducts, productController.getAllProducts);

const productRouter = Router();

productRouter
    .route('/')
    //.get(paginate.paginateProducts, productController.getAllProducts)
    .get(paginate.paginateProducts, productController.getProducts)

productRouter
    .route('/mega')
    .get(productController.getMegaFilteredProductItems)

productRouter
    .route('/price-range')
    .get(productController.getPriceRange)   
    
productRouter
    .route('/width-range')
    .get(productController.getWidthRange);
  
productRouter
    .route('/height-range')
    .get(productController.getHeightRange);    

module.exports = productRouter;