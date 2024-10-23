const chalk = require('chalk')
const { Pool } = require('pg')
const fs = require('fs')
const { Parser } = require('json2csv')
const pool = require('../../config/dbConfig');
const manageExportedFiles = require('./manageExportedFiles ');
// require('dotenv').config()

// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
// })

// Export function for product_categories
const exportProductCategoriesToCSV = async () => {
  try {
    // Query all product categories
    const result = await pool.query(`
        SELECT pc.product_id, p.product_code, pc.category_id
        FROM product_categories pc
        JOIN products p ON pc.product_id = p.id
      `)
    const data = result.rows

    // Convert the data to CSV format using json2csv
    const fields = ['product_id', 'product_code', 'category_id']; 
    const json2csvParser = new Parser({ fields })
    const csv = json2csvParser.parse(data)

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const directoryPath = `${__dirname}/data`
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true })
    }

    // Write CSV to a file
    const filePath = `${directoryPath}/exported_product_categories_${timestamp}.csv`
    fs.writeFileSync(filePath, csv)

    console.log(
      chalk.green(
        `Product categories data successfully exported to ${filePath}`,
      ),
    )
    manageExportedFiles();
    return csv;
  } catch (error) {
    console.error(chalk.red('Error exporting data to CSV:', error))
    throw error;
  } 
  // finally {
  //   pool.end()
  // }
}

module.exports = exportProductCategoriesToCSV
