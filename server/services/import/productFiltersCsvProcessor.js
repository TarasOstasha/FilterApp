const chalk = require('chalk');
const fs = require('fs');
const csv = require('csv-parser');
const db = require('../../models/index'); // Import your DB configuration


const processProductFiltersCsvFile = (csvFilePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    console.log(csvFilePath);
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', async (row) => {
        try {
          const { product_id, filter_field_id, filter_value } = row;

          // Validate that all necessary fields are present
          if (!product_id || !filter_field_id || !filter_value) {
            console.error(chalk.red(`Missing data in row: ${JSON.stringify(row)}`));
            return; // Skip this row if validation fails
          }

          // Insert data into the product_filters table
          await db.pool.query(
            `INSERT INTO product_filters (product_id, filter_field_id, filter_value)
             VALUES ($1, $2, $3)
             ON CONFLICT (product_id, filter_field_id) DO UPDATE 
             SET filter_value = EXCLUDED.filter_value`,  
            [product_id, filter_field_id, filter_value]
          );
          results.push(row);
        } catch (err) {
          console.error(chalk.red('Error inserting product filter:', err));
        }
      })
      .on('end', () => {
        console.log(chalk.green('CSV file for product_filters successfully processed and data inserted into the database'));
        resolve(results);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};

module.exports = processProductFiltersCsvFile;
