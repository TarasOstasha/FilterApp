// const chalk = require('chalk');
// const fs = require('fs');
// const csv = require('csv-parser');
// const db = require('../../models/index'); // Import your DB configuration

// // Define the correct path to your CSV file
// const processFilterFieldsCsvFile = (csvFilePath) => {
//   return new Promise((resolve, reject) => {
//     const results = [];
//     console.log(csvFilePath);
//     fs.createReadStream(csvFilePath)
//       .pipe(csv())
//       .on('data', async (row) => {
//         try {
//           const { id, field_name, field_type, allowed_values, sort_order } = row;

//           // Validate that all necessary fields are present
//           if (!id || !field_name || !field_type || !allowed_values) {
//             console.error(chalk.red(`Missing data in row: ${JSON.stringify(row)}`));
//             return; // Skip this row if validation fails
//           }

//           // Insert data into the filter_fields table
//           await db.pool.query(
//             `INSERT INTO filter_fields (field_name, field_type, allowed_values, sort_order)
//              VALUES ($1, $2, $3)
//              ON CONFLICT (id) DO UPDATE 
//              SET field_name = EXCLUDED.field_name, 
//                  field_type = EXCLUDED.field_type, 
//                  allowed_values = EXCLUDED.allowed_values
//                  sort_order = EXCLUDED.sort_order
//                  `,
//             [id, field_name, field_type, allowed_values, sort_order]
//           );
//           results.push(row);
//         } catch (err) {
//           console.error(chalk.red('Error inserting filter field:', err));
//         }
//       })
//       .on('end', () => {
//         console.log(chalk.green('CSV file for filter_fields successfully processed and data inserted into the database'));
//         resolve(results);
//       })
//       .on('error', (err) => {
//         reject(err);
//       });
//   });
// };

// module.exports = processFilterFieldsCsvFile;


const chalk = require('chalk');
const fs = require('fs');
const csv = require('csv-parser');
const { FilterField } = require('../../models');  // Your Sequelize models

/**
 * Reads a CSV of filter_fields with columns:
 *   id,field_name,field_type,allowed_values,sort_order
 * and upserts each row into the database via Sequelize.
 */
const processFilterFieldsCsvFile = (csvFilePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    let errorOccurred = false;

    console.log(`Importing filter_fields from: ${csvFilePath}`);

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', async (row) => {
        // Pause the stream while we do async work
        this.pause && this.pause();

        try {
          const {
            id,
            field_name,
            field_type,
            allowed_values,
            sort_order,
          } = row;

          // Basic validation
          if (!id || !field_name || !field_type) {
            console.error(
              chalk.red(`✗ Skipping row, missing required columns: ${JSON.stringify(row)}`)
            );
          } else {
            // Upsert via Sequelize
            await FilterField.upsert({
              id: parseInt(id, 10),
              field_name: field_name.trim(),
              field_type: field_type.trim(),
              allowed_values: allowed_values ? allowed_values.trim() : null,
              sort_order: sort_order ? parseInt(sort_order, 10) : null,
            });
            results.push(row);
          }
        } catch (err) {
          errorOccurred = true;
          console.error(chalk.red('✗ Error inserting filter_field:'), err.message);
        } finally {
          // Resume reading
          this.resume && this.resume();
        }
      })
      .on('end', () => {
        if (!errorOccurred) {
          console.log(
            chalk.green('✓ All filter_fields processed and upserted successfully.')
          );
        }
        resolve(results);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};

module.exports = processFilterFieldsCsvFile;

