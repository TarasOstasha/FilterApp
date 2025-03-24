const chalk = require('chalk');
const fs = require('fs');
const csv = require('csv-parser');
const db = require('../../models/index'); // Import your DB configuration

// Define the correct path to your CSV file
const processFilterFieldsCsvFile = (csvFilePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    console.log(csvFilePath);
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', async (row) => {
        try {
          const { id, field_name, field_type, allowed_values, sort_order } = row;

          // Validate that all necessary fields are present
          if (!id || !field_name || !field_type || !allowed_values) {
            console.error(chalk.red(`Missing data in row: ${JSON.stringify(row)}`));
            return; // Skip this row if validation fails
          }

          // Insert data into the filter_fields table
          await db.pool.query(
            `INSERT INTO filter_fields (field_name, field_type, allowed_values, sort_order)
             VALUES ($1, $2, $3)
             ON CONFLICT (id) DO UPDATE 
             SET field_name = EXCLUDED.field_name, 
                 field_type = EXCLUDED.field_type, 
                 allowed_values = EXCLUDED.allowed_values
                 sort_order = EXCLUDED.sort_order
                 `,
            [id, field_name, field_type, allowed_values, sort_order]
          );
          results.push(row);
        } catch (err) {
          console.error(chalk.red('Error inserting filter field:', err));
        }
      })
      .on('end', () => {
        console.log(chalk.green('CSV file for filter_fields successfully processed and data inserted into the database'));
        resolve(results);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};

module.exports = processFilterFieldsCsvFile;
