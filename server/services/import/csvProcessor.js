const chalk = require('chalk');
const fs = require('fs');
const csv = require('csv-parser');
const pool = require('../../config/dbConfig');

const OLD_PRODUCT_IMG_PREFIX = 'https://www.xyzDisplays.com/v/vspfiles/photos';
const NEW_PRODUCT_IMG_PREFIX = 'https://cdn4.volusion.store/wgjfq-aujvw/v/vspfiles/photos';

const normalizeProductImgLink = (url) => {
  if (!url || !url.includes(OLD_PRODUCT_IMG_PREFIX)) return url;
  return url.replace(OLD_PRODUCT_IMG_PREFIX, NEW_PRODUCT_IMG_PREFIX);
};

const processProductCsvFile = (csvFilePath) => {
  return new Promise((resolve, reject) => {
    const productMap = new Map(); // product_code → row group

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        //console.log('RAW ROW KEYS:', Object.keys(row));
        //console.log('RAW ROW VALUES:', Object.values(row));
        const code = row.product_code;
        if (!productMap.has(code)) productMap.set(code, []);
        productMap.get(code).push(row);
      })
      .on('end', async () => {
        try {
          const errorRows = [];

          for (const [product_code, rows] of productMap.entries()) {
            const {
              product_name,
              product_link,
              product_img_link,
              product_price,
              most_popular
            } = rows[0]; // take first for product insert

            const price = parseFloat(product_price);
            if (!Number.isFinite(price) || price <= 0) {
              errorRows.push({
                product_code,
                product_price,
                reason: 'Product price is 0',
              });
              continue;
            }

            const normalizedImgLink = normalizeProductImgLink(product_img_link);
            //console.log(chalk.red('Processing product product_img_link:', Object.values(rows[0])));
            const productResult = await pool.query(
              `INSERT INTO products (product_code, product_name, product_link, product_img_link, product_price, most_popular)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (product_code) DO UPDATE 
               SET product_name = COALESCE(EXCLUDED.product_name, products.product_name), 
                   product_link = COALESCE(EXCLUDED.product_link, products.product_link), 
                   product_img_link = COALESCE(EXCLUDED.product_img_link, products.product_img_link), 
                   product_price = COALESCE(EXCLUDED.product_price, products.product_price),
                   most_popular = COALESCE(EXCLUDED.most_popular, products.most_popular)
               RETURNING id;`,
              [product_code, product_name, product_link, normalizedImgLink, price, most_popular ? parseFloat(most_popular) : null]
            );

            const productId = productResult.rows[0].id;

            const uniqueCategories = new Set();
            const uniqueFilters = new Set();

            for (const row of rows) {
              const { category_id, filter_field_id, filter_value } = row;

              if (category_id && !uniqueCategories.has(category_id)) {
                await pool.query(
                  `INSERT INTO product_categories (product_id, category_id)
                   VALUES ($1, $2)
                   ON CONFLICT (product_id, category_id) DO NOTHING;`,
                  [productId, category_id]
                );
                uniqueCategories.add(category_id);
              }

              const filterKey = `${filter_field_id}|${filter_value}`;
              if (filter_field_id && filter_value && !uniqueFilters.has(filterKey)) {
                await pool.query(
                  `INSERT INTO product_filters (product_id, filter_field_id, filter_value)
                   VALUES ($1, $2, $3)
                   ON CONFLICT (product_id, filter_field_id, filter_value) DO NOTHING;`,
                  [productId, filter_field_id, filter_value]
                );
                uniqueFilters.add(filterKey);
              }
            }
          }

          if (errorRows.length > 0) {
            console.log(chalk.yellow(`CSV processed with ${errorRows.length} product(s) skipped due to invalid price`));
            resolve({ errorRows });
            return;
          }

          console.log(chalk.green('CSV file successfully processed and data inserted into the database'));
          resolve({ errorRows: [] });
        } catch (err) {
          console.error(chalk.red('Error inserting product:', err));
          reject(err);
        }
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};

module.exports = processProductCsvFile;
