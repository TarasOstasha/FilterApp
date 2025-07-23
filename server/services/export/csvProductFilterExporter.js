
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
// const exportProductFilterDataToCSV = async () => {
//   try {
//     // Query all categories
//     const result = await pool.query('SELECT * FROM product_filters');
//     const data = result.rows;

//     // Convert the data to CSV format using json2csv
//     const fields = ['product_id', 'filter_field_id', 'filter_value']; 
//     const json2csvParser = new Parser({ fields });
//     const csv = json2csvParser.parse(data);

//     const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//     const directoryPath = `${__dirname}/data`;
//     if (!fs.existsSync(directoryPath)) {
//       fs.mkdirSync(directoryPath, { recursive: true });
//     }

//     // Write CSV to a file
//     const filePath = `${directoryPath}/exported_product_filters_data_${timestamp}.csv`;
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

// module.exports = exportProductFilterDataToCSV;




// services/export/csvProductFilterExporter.js

const chalk = require('chalk');
const fs = require('fs');
const { Parser } = require('json2csv');
const { sequelize } = require('../../models');
const manageExportedFiles = require('./manageExportedFiles');

const exportProductFilterDataToCSV = async () => {
  try {
    // 1) Pull enriched rows from the DB
    const [rows] = await sequelize.query(`
      SELECT 
        pf.product_id,
        p.product_code,
        pf.filter_field_id,
        ff.field_name   AS filter_field_name,
        pf.filter_value
      FROM product_filters pf
      JOIN products       p  ON pf.product_id       = p.id
      JOIN filter_fields  ff ON pf.filter_field_id  = ff.id
      ORDER BY pf.product_id, pf.filter_field_id;
    `);

    // 2) Convert to CSV
    const fields = [
      'product_id',
      'product_code',
      'filter_field_id',
      'filter_field_name',
      'filter_value',
    ];
    const csv = new Parser({ fields }).parse(rows);

    // 3) Write file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = `${__dirname}/data`;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = `${dir}/exported_product_filters_${timestamp}.csv`;
    fs.writeFileSync(filePath, csv);

    console.log(chalk.green(`Product filters exported to ${filePath}`));
    manageExportedFiles();

    return csv;
  } catch (err) {
    console.error(chalk.red('Error exporting product_filters:'), err);
    throw err;
  }
};

module.exports = exportProductFilterDataToCSV;
