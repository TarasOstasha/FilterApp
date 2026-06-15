const createHttpError = require('http-errors');
const pool = require('../config/dbConfig');
const db = require('../models');

const Product = db.Product;

const OLD_PRODUCT_IMG_PREFIX = 'https://www.xyzDisplays.com/v/vspfiles/photos';
const NEW_PRODUCT_IMG_PREFIX = 'https://cdn4.volusion.store/wgjfq-aujvw/v/vspfiles/photos';

const normalizeProductImgLink = (url) => {
  if (!url || !url.includes(OLD_PRODUCT_IMG_PREFIX)) return url;
  return url.replace(OLD_PRODUCT_IMG_PREFIX, NEW_PRODUCT_IMG_PREFIX);
};

const parseCategoryIds = (raw) =>
  String(raw || '')
    .split(',')
    .map((id) => parseInt(id.trim(), 10))
    .filter(Number.isInteger);

const normalizeHideProduct = (raw) => {
  const value = String(raw ?? '').trim().toUpperCase();
  if (!value) return null;
  if (value === 'Y') return 'Y';
  return { invalid: true, value: String(raw ?? '').trim() };
};

async function getValidCategoryIds() {
  const { rows } = await pool.query('SELECT category_id FROM categories');
  return new Set(rows.map((row) => row.category_id).filter((id) => id != null));
}

async function getProductByCode(productCode) {
  const code = String(productCode || '').trim();
  if (!code) {
    throw createHttpError(400, 'Product code is required');
  }

  const result = await pool.query(
    `SELECT
      p.id,
      p.product_code,
      p.product_name,
      p.product_link,
      p.product_img_link,
      p.product_price,
      p.most_popular,
      COALESCE(p.hide_product, '') AS hide_product,
      COALESCE(STRING_AGG(pc.category_id::text, ',' ORDER BY pc.category_id), '') AS category_ids
    FROM products p
    LEFT JOIN product_categories pc ON p.id = pc.product_id
    WHERE p.product_code = $1
    GROUP BY
      p.id,
      p.product_code,
      p.product_name,
      p.product_link,
      p.product_img_link,
      p.product_price,
      p.most_popular,
      p.hide_product`,
    [code]
  );

  return result.rows[0] || null;
}

async function updateProductByCode(productCode, payload) {
  const code = String(productCode || '').trim();
  if (!code) {
    throw createHttpError(400, 'Product code is required');
  }

  const existing = await getProductByCode(code);
  if (!existing) {
    throw createHttpError(404, `Product not found: ${code}`);
  }

  const {
    product_name,
    product_link,
    product_img_link,
    product_price,
    most_popular,
    hide_product: rawHideProduct,
    category_ids: rawCategoryIds,
  } = payload;

  if (!product_name?.trim()) {
    throw createHttpError(400, 'product_name is required');
  }
  if (!product_link?.trim()) {
    throw createHttpError(400, 'product_link is required');
  }
  if (!product_img_link?.trim()) {
    throw createHttpError(400, 'product_img_link is required');
  }

  const hideProduct = normalizeHideProduct(rawHideProduct);
  if (hideProduct?.invalid) {
    throw createHttpError(400, 'Invalid hide_product (use Y or leave blank)');
  }

  const price = parseFloat(product_price);
  if (!Number.isFinite(price) || price <= 0) {
    throw createHttpError(400, 'Invalid product_price');
  }

  const categoryIds = parseCategoryIds(rawCategoryIds);
  const validCategoryIds = await getValidCategoryIds();

  if (categoryIds.length === 0) {
    throw createHttpError(400, 'Missing category_ids');
  }

  const missingIds = categoryIds.filter((id) => !validCategoryIds.has(id));
  if (missingIds.length > 0) {
    throw createHttpError(400, `Category ID does not exist: ${missingIds.join(', ')}`);
  }

  const normalizedImgLink = normalizeProductImgLink(product_img_link);
  const mostPopularValue =
    most_popular === '' || most_popular == null ? null : parseFloat(most_popular);

  if (mostPopularValue != null && !Number.isFinite(mostPopularValue)) {
    throw createHttpError(400, 'Invalid most_popular');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const productResult = await client.query(
      `UPDATE products
       SET product_name = $2,
           product_link = $3,
           product_img_link = $4,
           product_price = $5,
           most_popular = $6,
           hide_product = $7
       WHERE product_code = $1
       RETURNING id`,
      [
        code,
        product_name.trim(),
        product_link.trim(),
        normalizedImgLink.trim(),
        price,
        mostPopularValue,
        hideProduct,
      ]
    );

    const productId = productResult.rows[0].id;

    await client.query('DELETE FROM product_categories WHERE product_id = $1', [productId]);
    for (const categoryId of categoryIds) {
      await client.query(
        `INSERT INTO product_categories (product_id, category_id)
         VALUES ($1, $2)
         ON CONFLICT (product_id, category_id) DO NOTHING`,
        [productId, categoryId]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return getProductByCode(code);
}

async function deleteProductByCode(productCode) {
  const code = String(productCode || '').trim();
  if (!code) {
    throw createHttpError(400, 'Product code is required');
  }

  const product = await Product.findOne({
    where: { product_code: code },
    attributes: ['id', 'product_code'],
  });

  if (!product) {
    return null;
  }

  await product.destroy();
  return { id: product.id, product_code: product.product_code };
}

module.exports = {
  getProductByCode,
  updateProductByCode,
  deleteProductByCode,
};
