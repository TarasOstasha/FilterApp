const fs = require('fs');
const csv = require('csv-parser');
const db = require('../models/index'); // Import your DB configuration

// Define the correct path to your CSV file
const csvFilePath = __dirname + '/filter_products.csv';

const processCsvFile = () => {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', async (row) => {
        try {
          const { product_code, product_name, product_link, product_img_link, product_price } = row;
          await db.pool.query(
            `INSERT INTO products (product_code, product_name, product_link, product_img_link, product_price)
             VALUES ($1, $2, $3, $4, $5)`,
            [product_code, product_name, product_link, product_img_link, parseFloat(product_price)]
          );
        } catch (err) {
          console.error('Error inserting product:', err);
        }
      })
      .on('end', () => {
        console.log('CSV file successfully processed and data inserted into the database');
        resolve(results);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};

module.exports = { processCsvFile };
