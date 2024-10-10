const { Pool } = require('pg');
const Category = require('./category');
require('dotenv').config();


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


Category.pool = pool;


module.exports = db;