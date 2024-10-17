
const chalk = require('chalk');
const { Pool } = require('pg');
const fs = require('fs');
const { Parser } = require('json2csv');
const pool = require('../../config/dbConfig');
// require('dotenv').config(); 

// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
// });

// Export function for categories
const exportProductFilterDataToCSV = async () => {
  try {
    // Query all categories
    const result = await pool.query('SELECT * FROM product_filters');
    const data = result.rows;

    // Convert the data to CSV format using json2csv
    const fields = ['product_id', 'filter_field_id', 'filter_value']; 
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const directoryPath = `${__dirname}/data`;
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    // Write CSV to a file
    const filePath = `${directoryPath}/exported_product_filters_data_${timestamp}.csv`;
    fs.writeFileSync(filePath, csv);

    console.log(chalk.green(`Category data successfully exported to ${filePath}`));
  } catch (error) {
    console.error(chalk.red('Error exporting data to CSV:', error));
    throw error;
  } 
  // finally {
  //   pool.end(); 
  // }
};

module.exports = exportProductFilterDataToCSV;
