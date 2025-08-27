// const chalk = require('chalk')
// const fs = require('fs')
// const csv = require('csv-parser')
// const db = require('../../models/index') // Import your DB configuration

// // Define the correct path to your CSV file
// //const csvFilePath = __dirname + '/data/product_categories.csv';

// const processProductCategoriesCsvFile = (csvFilePath) => {
//   return new Promise((resolve, reject) => {
//     const results = [];
//     let errorOccurred = false;

//     fs.createReadStream(csvFilePath)
//       .pipe(csv())
//       .on('data', async (row) => {
//         try {
//           const { product_id, category_id } = row

//           // Validate that both product_id and category_id are present
//           if (!product_id || !category_id) {
//             errorOccurred = true;
//             throw new Error(`Missing data in row: ${JSON.stringify(row)}`);
//           }

//           await db.pool.query(
//             `INSERT INTO product_categories (product_id, category_id)
//              VALUES ($1, $2)
//              ON CONFLICT (product_id, category_id) DO NOTHING`,
//             [product_id, category_id],
//           )
//           results.push(row)
//         } catch (err) {
//           errorOccurred = true;
//           console.error(chalk.red('Error inserting product category:', err))
//         }
//       })
//       .on('end', () => {
//         console.log(
//           chalk.green(
//             'CSV file for product_categories successfully processed and data inserted into the database',
//           ),
//         )
//         resolve(results)
//       })
//       .on('error', (err) => {
//         reject(err)
//       })
//   })
// }

// module.exports = processProductCategoriesCsvFile

// main
const chalk = require('chalk');
const fs = require('fs');
const csv = require('csv-parser');
const db = require('../../models/index'); // Sequelize instance & models

const processProductCategoriesCsvFile = (csvFilePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    let errorOccurred = false;

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', async (row) => {
        try {
          console.log(chalk.blue('Processing row:'), row);

          const { product_id, category_id } = row;
          if (!product_id || !category_id) {
            errorOccurred = true;
            throw new Error(`Missing data in row: ${JSON.stringify(row)}`);
          }

          // Split the comma-separated category_id field
          const categoryIds = category_id
            .split(',')
            .map((id) => id.trim())
            .filter((id) => id !== '');

          // Insert each (product_id, category_id)
          for (const id of categoryIds) {
            await db.sequelize.query(
              `
                INSERT INTO product_categories (product_id, category_id)
                VALUES (:product_id, :category_id)
                ON CONFLICT (product_id, category_id) DO NOTHING
              `,
              {
                replacements: { product_id, category_id: id },
                type: db.sequelize.QueryTypes.INSERT,
              }
            );
          }

          results.push(row);
        } catch (err) {
          errorOccurred = true;
          console.error(
            chalk.red('Error inserting product categories:'),
            err.message
          );
        }
      })
      .on('end', () => {
        if (!errorOccurred) {
          console.log(
            chalk.green(
              'CSV file processed successfully and product_categories inserted.'
            )
          );
        }
        resolve(results);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};

module.exports = processProductCategoriesCsvFile;

