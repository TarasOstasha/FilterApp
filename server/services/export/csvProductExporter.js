const chalk = require('chalk');
const { Pool } = require('pg');
const fs = require('fs');
const { Parser } = require('json2csv');
require('dotenv').config(); 


const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Export function
const exportProductDataToCSV = async () => {
  try {
    // Query all products (adjust the query to include the data you need)
    const result = await pool.query('SELECT * FROM products');
    const data = result.rows;

    // Convert the data to CSV format using json2csv
    const fields = ['id', 'product_code', 'product_name', 'product_link', 'product_img_link', 'product_price'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const directoryPath = `${__dirname}/data`;
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
    // Write CSV to a file
    const filePath = `${directoryPath}/exported_product_data_${timestamp}.csv`;
    fs.writeFileSync(filePath, csv);

    console.log(chalk.green(`Data successfully exported to ${filePath}`));
  } catch (error) {
    console.error(chalk.red('Error exporting data to CSV:', error));
  } finally {
    pool.end(); 
  }
};


module.exports = exportProductDataToCSV;