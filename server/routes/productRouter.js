const { Router } = require('express');
const { paginate } = require('../middleware');
const { productController, productAdminController } = require('../controllers');

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

productRouter
    .route('/by-code/:productCode')
    .get(productAdminController.getByCode)
    .put(productAdminController.updateByCode)
    .delete(productAdminController.deleteByCode);

productRouter
    .route('/by-code')
    .post(productAdminController.create);

productRouter
    .route('/by-code/:productCode/filters')
    .get(productAdminController.getFiltersByCode)
    .put(productAdminController.updateFilterByCode);

module.exports = productRouter;