const express = require('express');
const queryParser = require('query-parser-express');
const { errorHandlers } = require('./middleware');
const { categoryController } = require('./controllers');

const app = express();

app.use(express.json());

app.use(
  queryParser({
    parseBoolean: true, // default true
    parseNumber: true, // default true
  }),
);

app.get('/category', categoryController.getAllCategories);

app.use(errorHandlers.errorHandler);

module.exports = app;
