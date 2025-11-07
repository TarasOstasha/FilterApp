// server/testDbConnection.js
require('dotenv').config();
const pool = require('./config/dbConfig');

(async () => {
  try {
    // Try to get a client connection from the pool
    const client = await pool.connect();
    console.log('✅ Database connection successful!');

    // Run a simple query to verify connectivity
    const res = await client.query('SELECT NOW()');
    console.log('🕒 Current time from DB:', res.rows[0]);

    // Release the client back to the pool
    client.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  } finally {
    await pool.end();
  }
})();
