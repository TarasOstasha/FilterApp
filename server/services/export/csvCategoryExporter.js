
const chalk = require('chalk');
const { Pool } = require('pg');
const fs = require('fs');
const { Parser } = require('json2csv');
const pool = require('../../config/dbConfig');
const manageExportedFiles = require('./manageExportedFiles');
// require('dotenv').config(); 

// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
// });

// Export function for categories
const exportCategoryDataToCSV = async () => {
  try {
    // Query all categories
    const result = await pool.query('SELECT * FROM categories');
    const data = result.rows;

    // Convert the data to CSV format using json2csv
    const fields = ['category_id', 'category_name']; 
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const directoryPath = `${__dirname}/data`;
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    // Write CSV to a file
    const filePath = `${directoryPath}/exported_category_data_${timestamp}.csv`;
    fs.writeFileSync(filePath, csv);

    console.log(chalk.green(`Category data successfully exported to ${filePath}`));
    manageExportedFiles();
    return csv;
  } catch (error) {
    console.error(chalk.red('Error exporting data to CSV:', error));
    throw error;
  } 
  // finally {
  //   pool.end(); 
  // }
};

module.exports = exportCategoryDataToCSV;
