const chalk = require('chalk');
const fs = require('fs');
const csv = require('csv-parser');
const db = require('../../models/index'); // Import your DB configuration

// Define the correct path to your CSV file
//const csvFilePath = __dirname + '/data/categories.csv';

const processCategoriesCsvFile = (csvFilePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    console.log(csvFilePath);
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      // .on('data', async (row) => {
      //   try {
      //     const { category_id, category_name } = row;

      //     // Insert data into the categories table
      //     await db.pool.query(
      //       `INSERT INTO categories (category_id, category_name)
      //        VALUES ($1, $2)
      //        ON CONFLICT (category_id) DO UPDATE 
      //        SET category_name = EXCLUDED.category_name`,  
      //       [category_id, category_name]
      //     );
      //     results.push(row);
      //   } catch (err) {
      //     console.error(chalk.red('Error inserting category:', err));
      //   }
      // })
      .on('data', async (row) => {
        try {
          const { category_id, category_name } = row;
      
          // Use Sequelize's upsert instead of raw query
          await db.sequelize.query(
            `INSERT INTO categories (category_id, category_name)
             VALUES (:category_id, :category_name)
             ON CONFLICT (category_id)
             DO UPDATE SET category_name = EXCLUDED.category_name`,
            {
              replacements: { category_id: parseInt(category_id, 10), category_name },
              type: db.sequelize.QueryTypes.INSERT,
            }
          );
      
          results.push(row);
        } catch (err) {
          console.error(chalk.red('Error inserting category:'), err);
        }
      })
      .on('end', () => {
        console.log(chalk.green('CSV file for categories successfully processed and data inserted into the database'));
        resolve(results);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};

module.exports = processCategoriesCsvFile;
