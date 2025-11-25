
// const chalk = require('chalk');
// const { Pool } = require('pg');
// const fs = require('fs');
// const { Parser } = require('json2csv');
// const pool = require('../../config/dbConfig');
// const manageExportedFiles = require('./manageExportedFiles');
// // require('dotenv').config(); 

// // const pool = new Pool({
// //   user: process.env.DB_USER,
// //   host: process.env.DB_HOST,
// //   database: process.env.DB_NAME,
// //   password: process.env.DB_PASSWORD,
// //   port: process.env.DB_PORT,
// // });

// // Export function for categories
// const exportFilterFieldDataToCSV = async () => {
//   try {
//     // Query all categories
//     const result = await pool.query('SELECT * FROM filter_fields');
//     const data = result.rows;

//     // Convert the data to CSV format using json2csv
//     const fields = ['id', 'field_name', 'field_type', 'allowed_values', 'sort_order']; 
//     const json2csvParser = new Parser({ fields });
//     const csv = json2csvParser.parse(data);

//     const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//     const directoryPath = `${__dirname}/data`;
//     if (!fs.existsSync(directoryPath)) {
//       fs.mkdirSync(directoryPath, { recursive: true });
//     }

//     // Write CSV to a file
//     const filePath = `${directoryPath}/exported_filter_fields_data_${timestamp}.csv`;
//     fs.writeFileSync(filePath, csv);

//     console.log(chalk.green(`Category data successfully exported to ${filePath}`));
//     manageExportedFiles();
//     return csv;
//   } catch (error) {
//     console.error(chalk.red('Error exporting data to CSV:', error));
//     throw error;
//   } 
//   // finally {
//   //   pool.end(); 
//   // }
// };

// module.exports = exportFilterFieldDataToCSV;


// server/services/export/csvFilterFieldExporter.js

const chalk = require('chalk');
const fs = require('fs');
const { Parser } = require('json2csv');
const { FilterField, sequelize } = require('../../models');   // <-- your Sequelize setup
const manageExportedFiles = require('./manageExportedFiles');

const exportFilterFieldDataToCSV = async () => {
  try {
    // 1) Fetch everything via Sequelize model
    //    raw: true → returns plain JS objects, not Model instances
    const filterFields = await FilterField.findAll({
      raw: true,
      order: [['id', 'ASC']],
    });

    // 2) Convert to CSV
    const fields = ['id', 'field_name', 'field_type', 'allowed_values', 'sort_order'];
    const csv = new Parser({ fields }).parse(filterFields);

    // 3) Write to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = `${__dirname}/data`;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = `${dir}/exported_filter_fields_${timestamp}.csv`;
    fs.writeFileSync(filePath, csv);

    console.log(chalk.green(`Filter fields exported to CSV: ${filePath}`));
    manageExportedFiles();
    return csv;
  } catch (err) {
    console.error(chalk.red('Error exporting filter_fields:'), err);
    throw err;
  }
};

module.exports = exportFilterFieldDataToCSV;
