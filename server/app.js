const express = require('express');
const queryParser = require('query-parser-express');
const cors = require('cors');
const { errorHandlers, paginate } = require('./middleware');
const { categoryController, filterFieldController, productCategoryController, productFilterController, productController } = require('./controllers');
const router = require('./routes');

const app = express();

const corsOptions = {
  origin: '*',
};

app.use(express.json());
app.use(cors(corsOptions));

app.use(
  queryParser({
    parseBoolean: true, // default true
    parseNumber: true, // default true
    parseArray: true,
    parseNull: true 
  }),
);

// app.get('/category', categoryController.getAllCategories);
// app.get('/filterField', filterFieldController.getAllFilterFields);
// app.get('/productCategory', productCategoryController.getAllProductCategories);
// app.get('/productFilter', productFilterController.getAllProductFilters);
// app.get('/products', paginate.paginateProducts, productController.getAllProducts);


app.get('/api/health', (_req, res) => res.sendStatus(200));

app.use('/api', router);

app.use(errorHandlers.errorHandler);

module.exports = app;
