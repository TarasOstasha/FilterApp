// const chalk = require('chalk');
// //const { Pool } = require('pg');
// const fs = require('fs');
// const { Parser } = require('json2csv');
// const pool = require('../../config/dbConfig');
// const manageExportedFiles = require('./manageExportedFiles ');
// // require('dotenv').config(); 


// // const pool = new Pool({
// //   user: process.env.DB_USER,
// //   host: process.env.DB_HOST,
// //   database: process.env.DB_NAME,
// //   password: process.env.DB_PASSWORD,
// //   port: process.env.DB_PORT,
// // });

// // Export function
// const exportProductDataToCSV = async () => {
//   try {
//     // Query all products (adjust the query to include the data you need)
//     //const result = await pool.query('SELECT * FROM products');
//     const result = await pool.query(`
//       SELECT 
//           p.id,
//           p.product_code, 
//           p.product_name, 
//           p.product_link, 
//           p.product_img_link, 
//           p.product_price, 
//           pc.category_id, 
//           pf.filter_field_id, 
//           pf.filter_value
//       FROM products p
//       LEFT JOIN product_categories pc ON p.id = pc.product_id
//       LEFT JOIN categories c ON pc.category_id = c.id
//       LEFT JOIN product_filters pf ON p.id = pf.product_id;
//     `);
//     const data = result.rows;

//     // Convert the data to CSV format using json2csv
//     //const fields = ['id', 'product_code', 'product_name', 'product_link', 'product_img_link', 'product_price'];
//     const fields = [
//       'id', 
//       'product_code', 
//       'product_name', 
//       'product_link', 
//       'product_img_link', 
//       'product_price', 
//       'category_id', 
//       'filter_field_id', 
//       'filter_value'
//     ];
//     const json2csvParser = new Parser({ fields });
//     const csv = json2csvParser.parse(data);

//     const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//     const directoryPath = `${__dirname}/data`;
//     if (!fs.existsSync(directoryPath)) {
//       fs.mkdirSync(directoryPath, { recursive: true });
//     }
//     // Write CSV to a file
//     const filePath = `${directoryPath}/exported_product_data_${timestamp}.csv`;
//     fs.writeFileSync(filePath, csv);
//     console.log(chalk.green(`Data successfully exported to ${filePath}`));
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


// module.exports = exportProductDataToCSV;


const chalk = require('chalk');
const fs = require('fs');
const { Parser } = require('json2csv');
const pool = require('../../config/dbConfig');
const manageExportedFiles = require('./manageExportedFiles');

const exportProductDataToCSV = async () => {
  try {

    const result = await pool.query(`
      SELECT DISTINCT ON (product_code)
        id,
        product_code, 
        product_name, 
        product_link, 
        product_img_link, 
        product_price
      FROM products
      ORDER BY product_code, id;
    `);

    const data = result.rows;


    const fields = [
      'id', 
      'product_code', 
      'product_name', 
      'product_link', 
      'product_img_link', 
      'product_price'
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);


    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const directoryPath = `${__dirname}/data`;

    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    const filePath = `${directoryPath}/exported_product_data_${timestamp}.csv`;
    fs.writeFileSync(filePath, csv);

    console.log(chalk.green(`Data successfully exported to ${filePath}`));
    manageExportedFiles(); 
    return csv;
  } catch (error) {
    console.error(chalk.red('Error exporting data to CSV:'), error);
    throw error;
  }
};

module.exports = exportProductDataToCSV;
