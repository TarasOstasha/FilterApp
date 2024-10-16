const { Pool } = require('pg');
const fs = require('fs');
const { Parser } = require('json2csv');
require('dotenv').config(); 

// DB_USER=postgres
// DB_PASSWORD=1111
// DB_HOST=localhost
// DB_PORT=5432
// DB_NAME=filter

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Export function
const exportDataToCSV = async () => {
  try {
    // Query all products (adjust the query to include the data you need)
    const result = await pool.query('SELECT * FROM products');
    const data = result.rows;

    // Convert the data to CSV format using json2csv
    const fields = ['id', 'product_code', 'product_name', 'product_link', 'product_img_link', 'product_price'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // Write CSV to a file
    const filePath = `${__dirname}/exported_data_${timestamp}.csv`;
    fs.writeFileSync(filePath, csv);

    console.log(`Data successfully exported to ${filePath}`);
  } catch (error) {
    console.error('Error exporting data to CSV:', error);
  } finally {
    pool.end(); 
  }
};


module.exports = { exportDataToCSV };
