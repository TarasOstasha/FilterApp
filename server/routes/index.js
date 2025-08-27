const { Router } = require('express');

const categoryRouter = require('./categoryRouter');
const filterFieldsRouter = require('./filterFieldsRouter');
const productCategoryRouter = require('./productCategoryRouter');
const productFilterRouter = require('./productFilterRouter');
const productRouter = require('./productRouter');
const importRouter = require('./importRouter');
const exportRouter = require('./exportRouter');
const authRouter = require('./authRouter');
const dynamicFilterRouter = require('./dynamicFilterRouter');



const router = Router();


//api
router.use('/category', categoryRouter);
router.use('/filterField', filterFieldsRouter);
router.use('/productCategory', productCategoryRouter);
router.use('/productFilter', productFilterRouter);
router.use('/products', productRouter);
router.use('/upload-csv', importRouter);
router.use('/export', exportRouter);
router.use('/admin', authRouter);
router.use('/dynamic-filters', dynamicFilterRouter);



// app.get('/category', categoryController.getAllCategories);
// app.get('/filterField', filterFieldController.getAllFilterFields);
// app.get('/productCategory', productCategoryController.getAllProductCategories);
// app.get('/productFilter', productFilterController.getAllProductFilters);
// app.get('/products', paginate.paginateProducts, productController.getAllProducts);


module.exports = router;