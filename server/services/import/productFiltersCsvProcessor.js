// const chalk = require('chalk')
// const fs = require('fs')
// const csv = require('csv-parser')
// const db = require('../../models/index') // Import your DB configuration

// const processProductFiltersCsvFile = (csvFilePath) => {
//   console.log('!!!')
//   return new Promise((resolve, reject) => {
//     const results = []
//     console.log(csvFilePath, '<< csvFilePath')
//     fs.createReadStream(csvFilePath)
//       .pipe(csv())
//       .on('data', async (row) => {
//         try {
//           const { product_id, filter_field_id, filter_value } = row
//           console.log(product_id, '-product_id')
//           // Validate that all necessary fields are present
//           if (!product_id || !filter_field_id || !filter_value) {
//             console.error(
//               chalk.red(`Missing data in row: ${JSON.stringify(row)}`),
//             )
//             return // Skip this row if validation fails
//           }

//           // Insert data into the product_filters table
//           // await db.pool.query(
//           //   `INSERT INTO product_filters (product_id, filter_field_id, filter_value)
//           //    VALUES ($1, $2, $3)
//           //    ON CONFLICT (product_id, filter_field_id) DO UPDATE
//           //    SET filter_value = EXCLUDED.filter_value`,
//           //   [product_id, filter_field_id, filter_value]
//           // );
//           // await db.pool.query(
//           //   `INSERT INTO product_filters (product_id, filter_field_id, filter_value)
//           //    VALUES ($1, $2, $3)`,
//           //   [product_id, filter_field_id, filter_value]
//           // );
//           // Check if the exact combination of product_id, filter_field_id, and filter_value already exists
//           const existingRow = await db.pool.query(
//             `SELECT 1 FROM product_filters 
//                        WHERE product_id = $1 AND filter_field_id = $2 AND filter_value = $3`,
//             [product_id, filter_field_id, filter_value],
//           )

//           if (existingRow.rows.length === 0) {
//             await db.pool.query(
//               `INSERT INTO product_filters (product_id, filter_field_id, filter_value)
//                VALUES ($1, $2, $3)`,
//               [product_id, filter_field_id, filter_value],
//             )
//             console.log(chalk.green('Inserted new row:'), {
//               product_id,
//               // filter_field_id,
//               // filter_value,
//             })
//             results.push(row)
//           } else {
//             console.log(chalk.yellow('Skipped duplicate row:'), {
//               product_id,
//               // filter_field_id,
//               // filter_value,
//             })
//           }
//         } catch (err) {
//           console.error(chalk.red('Error inserting product filter:', err))
//         }
//       })
//       .on('end', () => {
//         console.log(
//           chalk.green(
//             'CSV file for product_filters successfully processed and data inserted into the database',
//           ),
//         )
//         resolve(results)
//       })
//       .on('error', (err) => {
//         reject(err)
//       })
//   })
// }

// module.exports = processProductFiltersCsvFile



// server/services/import/productFiltersCsvProcessor.js
// updated
// const chalk = require('chalk');
// const fs = require('fs');
// const csv = require('csv-parser');
// const { sequelize } = require('../../models');

// const processProductFiltersCsvFile = (csvFilePath) =>
//   new Promise((resolve, reject) => {
//     const pending = [], results = [];
//     let errorOccurred = false;

//     fs.createReadStream(csvFilePath)
//       .pipe(csv())
//       .on('data', row => {
//         const pi = parseInt(row.product_id, 10);
//         const ff = parseInt(row.filter_field_id, 10);
//         const fv = row.filter_value?.trim();
//         if (!pi || !ff || !fv) return console.warn(`Skipping bad row: ${JSON.stringify(row)}`);

//         // queue raw insert
//         pending.push(
//           sequelize.query(
//             `INSERT INTO product_filters
//                (product_id, filter_field_id, filter_value)
//              VALUES (:pi, :ff, :fv)
//              ON CONFLICT (product_id, filter_field_id, filter_value) DO NOTHING`,
//             {
//               replacements: { pi, ff, fv },
//               type: sequelize.QueryTypes.INSERT
//             }
//           ).then(() => results.push(row))
//            .catch(err => {
//              errorOccurred = true;
//              console.error(chalk.red('Insert failed:'), err.message);
//            })
//         );
//       })
//       .on('end', async () => {
//         await Promise.all(pending);
//         if (!errorOccurred) console.log(chalk.green('All filters imported.'));
//         resolve(results);
//       })
//       .on('error', reject);
//   });

// module.exports = processProductFiltersCsvFile;




const chalk       = require('chalk');
const fs          = require('fs');
const csv         = require('csv-parser');
const { sequelize } = require('../../models');
const { QueryTypes } = require('sequelize');

async function processProductFiltersCsvFile(csvFilePath) {
  const successRows = [];
  const errorRows   = [];
  const pending     = [];
  const seenPairs   = new Set();

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', row => {
        const piRaw = row.product_id;
        const ffRaw = row.filter_field_id;
        const fvRaw = row.filter_value;

        const product_id      = parseInt(piRaw, 10);
        const filter_field_id = parseInt(ffRaw, 10);

        if (!product_id || !filter_field_id || !fvRaw) {
          errorRows.push({
            row,
            reason: 'Missing product_id, filter_field_id, or filter_value'
          });
          return;
        }

        const pairKey = `${product_id}::${filter_field_id}`;
        if (!seenPairs.has(pairKey)) {
          seenPairs.add(pairKey);

          // delete any old rows for this product/field
          pending.push(
            sequelize.query(
              `DELETE FROM product_filters
                 WHERE product_id = :pi
                   AND filter_field_id = :ff`,
              {
                replacements: { pi: product_id, ff: filter_field_id },
                type: QueryTypes.DELETE
              }
            )
            .then(() => console.log(
              chalk.gray(`Cleared old values for ${pairKey}`)
            ))
            .catch(err => {
              errorRows.push({ row, reason: err.message });
              console.error(
                chalk.red(`Failed clearing old for ${pairKey}:`),
                err.message
              );
            })
          );
        }

        // split on comma + optional whitespace
        const values = fvRaw
          .split(/\s*,\s*/)
          .filter(v => v.length);

        for (const filter_value of values) {
          pending.push(
            sequelize.query(
              `INSERT INTO product_filters
                 (product_id, filter_field_id, filter_value)
               VALUES (:pi, :ff, :fv)
               ON CONFLICT (product_id, filter_field_id, filter_value) DO NOTHING;`,
              {
                replacements: {
                  pi: product_id,
                  ff: filter_field_id,
                  fv: filter_value
                },
                type: QueryTypes.INSERT
              }
            )
            .then(() => {
              successRows.push({ product_id, filter_field_id, filter_value });
              console.log(
                chalk.green(`Upserted ${pairKey} → "${filter_value}"`)
              );
            })
            .catch(err => {
              errorRows.push({ row, filter_value, reason: err.message });
              console.error(
                chalk.red(`Insert failed for ${pairKey}="${filter_value}":`),
                err.message
              );
            })
          );
        }
      })
      .on('end', async () => {
        await Promise.all(pending);
        console.log(chalk.blue(
          `\n Import complete — ${successRows.length} rows upserted, ${errorRows.length} errors.`
        ));
        resolve({ successRows, errorRows });
      })
      .on('error', reject);
  });
}

module.exports = processProductFiltersCsvFile;







