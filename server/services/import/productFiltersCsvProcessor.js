const chalk = require('chalk')
const fs = require('fs')
const csv = require('csv-parser')
const db = require('../../models/index') // Import your DB configuration

const processProductFiltersCsvFile = (csvFilePath) => {
  console.log('!!!')
  return new Promise((resolve, reject) => {
    const results = []
    console.log(csvFilePath, '<< csvFilePath')
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', async (row) => {
        try {
          const { product_id, filter_field_id, filter_value } = row
          console.log(product_id, '-product_id')
          // Validate that all necessary fields are present
          if (!product_id || !filter_field_id || !filter_value) {
            console.error(
              chalk.red(`Missing data in row: ${JSON.stringify(row)}`),
            )
            return // Skip this row if validation fails
          }

          // Insert data into the product_filters table
          // await db.pool.query(
          //   `INSERT INTO product_filters (product_id, filter_field_id, filter_value)
          //    VALUES ($1, $2, $3)
          //    ON CONFLICT (product_id, filter_field_id) DO UPDATE
          //    SET filter_value = EXCLUDED.filter_value`,
          //   [product_id, filter_field_id, filter_value]
          // );
          // await db.pool.query(
          //   `INSERT INTO product_filters (product_id, filter_field_id, filter_value)
          //    VALUES ($1, $2, $3)`,
          //   [product_id, filter_field_id, filter_value]
          // );
          // Check if the exact combination of product_id, filter_field_id, and filter_value already exists
          const existingRow = await db.pool.query(
            `SELECT 1 FROM product_filters 
                       WHERE product_id = $1 AND filter_field_id = $2 AND filter_value = $3`,
            [product_id, filter_field_id, filter_value],
          )

          if (existingRow.rows.length === 0) {
            await db.pool.query(
              `INSERT INTO product_filters (product_id, filter_field_id, filter_value)
               VALUES ($1, $2, $3)`,
              [product_id, filter_field_id, filter_value],
            )
            console.log(chalk.green('Inserted new row:'), {
              product_id,
              // filter_field_id,
              // filter_value,
            })
            results.push(row)
          } else {
            console.log(chalk.yellow('Skipped duplicate row:'), {
              product_id,
              // filter_field_id,
              // filter_value,
            })
          }
        } catch (err) {
          console.error(chalk.red('Error inserting product filter:', err))
        }
      })
      .on('end', () => {
        console.log(
          chalk.green(
            'CSV file for product_filters successfully processed and data inserted into the database',
          ),
        )
        resolve(results)
      })
      .on('error', (err) => {
        reject(err)
      })
  })
}

module.exports = processProductFiltersCsvFile
