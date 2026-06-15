/**
 * Load product_codes where hide_product = 'Y' (same rule as GET /api/products).
 */
const { Sequelize, QueryTypes } = require('sequelize');
const config = require('../../config/config.js')[process.env.NODE_ENV || 'test'];
const { HIDDEN_PRODUCT_FLAG } = require('../../utils/productVisibility');

/** @type {Promise<Set<string>>|null} */
let cachedPromise = null;

/**
 * @returns {Promise<Set<string>>}
 */
function fetchHiddenProductCodes() {
  if (!cachedPromise) {
    cachedPromise = loadHiddenProductCodes();
  }
  return cachedPromise;
}

async function loadHiddenProductCodes() {
  const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );

  try {
    const rows = await sequelize.query(
      `
      SELECT DISTINCT TRIM(product_code) AS product_code
      FROM products
      WHERE COALESCE(hide_product, '') = :flag
        AND product_code IS NOT NULL
        AND TRIM(product_code) <> ''
      ORDER BY product_code
      `,
      {
        replacements: { flag: HIDDEN_PRODUCT_FLAG },
        type: QueryTypes.SELECT,
      }
    );

    return new Set(rows.map((r) => String(r.product_code).trim()).filter(Boolean));
  } finally {
    await sequelize.close();
  }
}

module.exports = {
  fetchHiddenProductCodes,
};
