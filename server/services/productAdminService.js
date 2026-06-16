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
    WHERE UPPER(TRIM(p.product_code)) = UPPER($1)
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

  const canonicalCode = existing.product_code;

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
        canonicalCode,
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

  return getProductByCode(canonicalCode);
}

async function deleteProductByCode(productCode) {
  const code = String(productCode || '').trim();
  if (!code) {
    throw createHttpError(400, 'Product code is required');
  }

  const product = await getProductByCode(code);
  if (!product) {
    return null;
  }

  await Product.destroy({ where: { id: product.id } });
  return { id: product.id, product_code: product.product_code };
}

async function getProductFiltersByCode(productCode) {
  const product = await getProductByCode(productCode);
  if (!product) {
    return null;
  }

  const fieldsResult = await pool.query(
    `SELECT id, field_name, field_type, allowed_values, sort_order
     FROM filter_fields
     ORDER BY sort_order ASC, id ASC`
  );

  const productFiltersResult = await pool.query(
    `SELECT
      filter_field_id,
      TRIM(filter_value) AS filter_value
    FROM product_filters
    WHERE product_id = $1
      AND TRIM(filter_value) <> ''
    ORDER BY filter_field_id, TRIM(filter_value)`,
    [product.id]
  );

  const valuesResult = await pool.query(
    `SELECT
      pf.filter_field_id,
      TRIM(pf.filter_value) AS filter_value
    FROM product_filters pf
    WHERE TRIM(pf.filter_value) <> ''
    GROUP BY pf.filter_field_id, TRIM(pf.filter_value)
    ORDER BY pf.filter_field_id, TRIM(pf.filter_value)`
  );

  const productValuesByFieldId = productFiltersResult.rows.reduce((acc, row) => {
    if (!acc[row.filter_field_id]) {
      acc[row.filter_field_id] = [];
    }
    acc[row.filter_field_id].push(row.filter_value);
    return acc;
  }, {});

  const valuesByFieldId = valuesResult.rows.reduce((acc, row) => {
    if (!acc[row.filter_field_id]) {
      acc[row.filter_field_id] = [];
    }
    acc[row.filter_field_id].push(row.filter_value);
    return acc;
  }, {});

  const filters = [];

  for (const field of fieldsResult.rows) {
    const configuredValues = field.allowed_values
      ? field.allowed_values.split(',').map((v) => v.trim()).filter(Boolean)
      : [];
    const existingValues = valuesByFieldId[field.id] || [];
    const allowed_values = [...new Set([...configuredValues, ...existingValues])];
    const productValues = productValuesByFieldId[field.id] || [];

    if (productValues.length === 0) {
      filters.push({
        filter_field_id: field.id,
        value_index: 1,
        field_name: field.field_name,
        display_name: field.field_name,
        field_type: field.field_type,
        current_value: '',
        allowed_values,
      });
      continue;
    }

    productValues.forEach((currentValue, index) => {
      const value_index = index + 1;
      const display_name =
        productValues.length > 1
          ? `${field.field_name} (${value_index})`
          : field.field_name;

      filters.push({
        filter_field_id: field.id,
        value_index,
        field_name: field.field_name,
        display_name,
        field_type: field.field_type,
        current_value: currentValue,
        allowed_values,
      });
    });
  }

  return {
    product_code: product.product_code,
    filters,
  };
}

async function updateProductFilterByCode(productCode, payload) {
  const product = await getProductByCode(productCode);
  if (!product) {
    throw createHttpError(404, 'Product not found');
  }

  const filterFieldId = parseInt(payload?.filter_field_id, 10);
  if (!Number.isInteger(filterFieldId) || filterFieldId <= 0) {
    throw createHttpError(400, 'filter_field_id is required');
  }

  const valueIndex = parseInt(payload?.value_index, 10);
  if (!Number.isInteger(valueIndex) || valueIndex <= 0) {
    throw createHttpError(400, 'value_index is required');
  }

  const filterValue = String(payload?.filter_value ?? '').trim();

  const fieldResult = await pool.query(
    'SELECT id FROM filter_fields WHERE id = $1',
    [filterFieldId]
  );
  if (!fieldResult.rows[0]) {
    throw createHttpError(404, 'Filter field not found');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingRows = await client.query(
      `SELECT TRIM(filter_value) AS filter_value
       FROM product_filters
       WHERE product_id = $1 AND filter_field_id = $2
       ORDER BY TRIM(filter_value)`,
      [product.id, filterFieldId]
    );

    const oldValue = existingRows.rows[valueIndex - 1]?.filter_value || '';

    if (!oldValue && !filterValue) {
      await client.query('COMMIT');
      return getProductFiltersByCode(product.product_code);
    }

    if (!oldValue && filterValue) {
      await client.query(
        `INSERT INTO product_filters (product_id, filter_field_id, filter_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (product_id, filter_field_id, filter_value) DO NOTHING`,
        [product.id, filterFieldId, filterValue]
      );
    } else if (oldValue && !filterValue) {
      await client.query(
        `DELETE FROM product_filters
         WHERE product_id = $1
           AND filter_field_id = $2
           AND TRIM(filter_value) = $3`,
        [product.id, filterFieldId, oldValue]
      );
    } else if (oldValue !== filterValue) {
      const duplicate = existingRows.rows.some(
        (row, index) => index !== valueIndex - 1 && row.filter_value === filterValue
      );
      if (duplicate) {
        throw createHttpError(400, 'That filter value already exists for this field');
      }

      await client.query(
        `UPDATE product_filters
         SET filter_value = $4
         WHERE product_id = $1
           AND filter_field_id = $2
           AND TRIM(filter_value) = $3`,
        [product.id, filterFieldId, oldValue, filterValue]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return getProductFiltersByCode(product.product_code);
}

module.exports = {
  getProductByCode,
  updateProductByCode,
  deleteProductByCode,
  getProductFiltersByCode,
  updateProductFilterByCode,
};
