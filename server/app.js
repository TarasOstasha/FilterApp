const express = require('express');
const queryParser = require('query-parser-express');
const cors = require('cors');
const path = require('path');
const { errorHandlers, paginate } = require('./middleware');
const { categoryController, filterFieldController, productCategoryController, productFilterController, productController } = require('./controllers');
const router = require('./routes');

const app = express();

const corsOptions = {
  // origin: '*', // on the production, replace with 'https://www.xyzdisplays.com'
  origin: [
    'https://xyzdisplays.com',
    'https://www.xyzdisplays.com',
    'https://filter.xyzdisplays.com',
    'https://hxyrr-gdtbo.volusion.store',
    'http://localhost:3000', // keep for local development
  ],
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

app.use((req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});

// app.get('/category', categoryController.getAllCategories);
// app.get('/filterField', filterFieldController.getAllFilterFields);
// app.get('/productCategory', productCategoryController.getAllProductCategories);
// app.get('/productFilter', productFilterController.getAllProductFilters);
// app.get('/products', paginate.paginateProducts, productController.getAllProducts);


app.get('/api/health', (_req, res) => res.sendStatus(200));

app.use('/api', router);

app.use(errorHandlers.errorHandler);

// 👇 serve the built client
const clientBuildPath = path.join(__dirname, '../client/build');
app.use(express.static(clientBuildPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

module.exports = app;
