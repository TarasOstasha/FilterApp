const express = require('express');
const queryParser = require('query-parser-express');
const { errorHandlers } = require('./middleware');
const { categoryController, filterFieldController, productCategoryController, productFilterController, productController } = require('./controllers');

const app = express();

app.use(express.json());

app.use(
  queryParser({
    parseBoolean: true, // default true
    parseNumber: true, // default true
  }),
);

app.get('/category', categoryController.getAllCategories);
app.get('/filterField', filterFieldController.getAllFilterFields);
app.get('/productCategory', productCategoryController.getAllProductCategories);
app.get('/productFilter', productFilterController.getAllProductFilters);
app.get('/products', productController.getAllProducts);

app.use(errorHandlers.errorHandler);

module.exports = app;
