

const chalk = require('chalk');
const fs = require('fs');
const csv = require('csv-parser');
//const db = require('../../models/index'); // Make sure this path is correct for your project
const db = require('../../models'); 

const processProductFiltersCsvFile = (csvFilePath) => {
  return new Promise((resolve, reject) => {
    const successRows = [];
    const errorRows = [];
    const pending = [];
    const seenPairs = new Set();

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        try {
          const product_id = parseInt(row.product_id, 10);
          const filter_field_id = parseInt(row.filter_field_id, 10);
          const filter_value = row.filter_value?.trim();

          if (!product_id || !filter_field_id || !filter_value) {
            errorRows.push({ row, reason: 'Missing product_id, filter_field_id, or filter_value' });
            console.error(chalk.red(`Missing data in row: ${JSON.stringify(row)}`));
            return;
          }

          const pairKey = `${product_id}::${filter_field_id}`;
          
          // Delete old values for this product+filter_field combo (only once per pair)
          if (!seenPairs.has(pairKey)) {
            seenPairs.add(pairKey);
            pending.push(
              db.sequelize.query(
                `DELETE FROM product_filters
                 WHERE product_id = :product_id
                   AND filter_field_id = :filter_field_id`,
                {
                  replacements: { product_id, filter_field_id },
                  type: db.sequelize.QueryTypes.DELETE,
                }
              )
              .then(() => console.log(chalk.gray(`Cleared old values for product ${product_id}, filter ${filter_field_id}`)))
              .catch(err => {
                errorRows.push({ row, reason: `Failed to clear old values: ${err.message}` });
                console.error(chalk.red(`Failed to clear old values: ${err.message}`));
              })
            );
          }

          // Split the filter_value by comma and trim
          const values = filter_value
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v !== '');

          // Insert new values
          for (const val of values) {
            pending.push(
              db.sequelize.query(
                `INSERT INTO product_filters (product_id, filter_field_id, filter_value)
                 VALUES (:product_id, :filter_field_id, :filter_value)
                 ON CONFLICT (product_id, filter_field_id, filter_value) DO NOTHING`,
                {
                  replacements: {
                    product_id,
                    filter_field_id,
                    filter_value: val,
                  },
                  type: db.sequelize.QueryTypes.INSERT,
                }
              )
              .then(() => {
                console.log(chalk.green(`Inserted: product ${product_id}, filter ${filter_field_id} → "${val}"`));
                successRows.push({ product_id, filter_field_id, filter_value: val });
              })
              .catch(err => {
                errorRows.push({ row, filter_value: val, reason: `Insert failed: ${err.message}` });
                console.error(chalk.red(`Insert failed: ${err.message}`));
              })
            );
          }
        } catch (err) {
          errorRows.push({ row, reason: `Error processing row: ${err.message}` });
          console.error(chalk.red('Error processing row:'), err.message);
        }
      })
      .on('end', async () => {
        await Promise.all(pending);
        if (errorRows.length === 0) {
          console.log(
            chalk.green(
              `CSV file processed successfully. ${successRows.length} product_filters inserted.`
            )
          );
        } else {
          console.log(chalk.yellow(`CSV processing completed with ${errorRows.length} errors.`));
        }
        resolve({ successRows, errorRows });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};

module.exports = processProductFiltersCsvFile;
