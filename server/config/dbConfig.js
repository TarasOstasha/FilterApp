require('dotenv').config();
const { Pool } = require('pg');

// Create the pool object for database connection
// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
// });



const connectionString =
  process.env.DATABASE_URL ||
  `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const pool = new Pool({
  connectionString,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { require: true, rejectUnauthorized: false }
      : false,
  // optional tuning
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});


module.exports = pool;
