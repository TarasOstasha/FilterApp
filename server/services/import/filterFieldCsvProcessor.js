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

// updated one
const chalk = require('chalk');
const fs    = require('fs');
const csv   = require('csv-parser');
const { FilterField } = require('../../models');

const processFilterFieldsCsvFile = (csvFilePath) =>
  new Promise((resolve, reject) => {
    console.log(`Importing filter_fields from: ${csvFilePath}`);

    const pending      = [];
    let errorOccurred  = false;
    const results      = [];
    const parser       = fs.createReadStream(csvFilePath).pipe(csv());

    parser.on('data', (row) => {
      // parse & validate
      const id            = parseInt(row.id,        10);
      const field_name    = row.field_name?.trim();
      const field_type    = row.field_type?.trim();
      const allowed_values= row.allowed_values?.trim() || null;
      const sort_order    = row.sort_order
                            ? parseInt(row.sort_order, 10)
                            : null;

      if (!id || !field_name || !field_type) {
        console.warn(chalk.yellow(`Skipping invalid row: ${JSON.stringify(row)}`));
        return;
      }

      // queue upsert
      pending.push(
        FilterField.upsert({ id, field_name, field_type, allowed_values, sort_order })
          .then(() => {
            results.push(row);
          })
          .catch((err) => {
            errorOccurred = true;
            console.error(chalk.red('Error upserting filter_field:'), err.message);
          })
      );
    });

    parser.on('end', async () => {
      // wait for _all_ upserts to finish
      await Promise.all(pending);
      if (!errorOccurred) {
        console.log(chalk.green('✓ All filter_fields processed and upserted successfully.'));
      }
      resolve(results);
    });

    parser.on('error', (err) => reject(err));
  });

module.exports = processFilterFieldsCsvFile;




