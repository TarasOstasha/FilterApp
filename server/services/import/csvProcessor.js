const chalk = require('chalk');
const fs = require('fs');
const csv = require('csv-parser');
const db = require('../../models/index'); // Import your DB configuration

// Define the correct path to your CSV file
//const csvFilePath = __dirname + '/data/filter_products.csv';

const processProductCsvFile = (csvFilePath) => {
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', async (row) => {
        try {
          const { product_code, product_name, product_link, product_img_link, product_price, category_id, filter_field_id, filter_value } = row;
          
          const productResult = await db.pool.query(
            `INSERT INTO products (product_code, product_name, product_link, product_img_link, product_price)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (product_code) DO UPDATE 
            SET product_name = EXCLUDED.product_name, 
                product_link = EXCLUDED.product_link, 
                product_img_link = EXCLUDED.product_img_link, 
                product_price = EXCLUDED.product_price
            RETURNING id;`,
            [product_code, product_name, product_link, product_img_link, parseFloat(product_price)]
          );

          const productId = productResult.rows[0].id;

          if (category_id) {
            await db.pool.query(
              `INSERT INTO product_categories (product_id, category_id)
              VALUES ($1, $2)
              ON CONFLICT (product_id, category_id) DO NOTHING;`,
              [productId, category_id]
            );
          }

          if (filter_field_id && filter_value) {
            await db.pool.query(
              `INSERT INTO product_filters (product_id, filter_field_id, filter_value)
              VALUES ($1, $2, $3)
              ON CONFLICT (product_id, filter_field_id) DO UPDATE 
              SET filter_value = EXCLUDED.filter_value;`,
              [productId, filter_field_id, filter_value]
            );
          }
        } catch (err) {
          console.error(chalk.red('Error inserting product:', err));
        }
      })
      .on('end', () => {
        console.log(chalk.green('CSV file successfully processed and data inserted into the database'));
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};

module.exports = processProductCsvFile;
