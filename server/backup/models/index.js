require('dotenv').config();
const { Pool } = require('pg');
const Category = require('./category');
const FilterField = require('./filterField');
const ProductCategory = require('./productCategory');
const ProductFilter = require('./productFilter');
const Product = require('./product');
const Authentication = require('./authentication');



const connectionOptions = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
  };

const pool = new Pool(connectionOptions);

// close DB when app stop
process.on('beforeExit', () => pool.end());

const db = {};
db.pool = pool;

db.Category = Category;
db.FilterField = FilterField;
db.ProductCategory = ProductCategory;
db.ProductFilter = ProductFilter;
db.Product = Product;
db.Authentication = Authentication;


Category.pool = pool;
FilterField.pool = pool;
ProductCategory.pool = pool;
ProductFilter.pool = pool;
Product.pool = pool;
Authentication.pool = pool;

module.exports = db;