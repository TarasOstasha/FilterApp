/**
 * Visible catalog prices from products.product_price (source of truth for API price filter).
 */
const { Sequelize, QueryTypes } = require('sequelize');
const config = require('../../config/config.js')[process.env.NODE_ENV || 'test'];
const { visibleProductSql } = require('../../utils/productVisibility');

/** @type {Promise<object[]>|null} */
let cachedPromise = null;

/**
 * @typedef {{ product_code: string, product_price: number }} CatalogPriceRow
 */

/**
 * @returns {Promise<CatalogPriceRow[]>}
 */
function fetchVisibleCatalogPrices() {
  if (!cachedPromise) {
    cachedPromise = loadVisibleCatalogPrices();
  }
  return cachedPromise;
}

async function loadVisibleCatalogPrices() {
  const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );

  try {
    const rows = await sequelize.query(
      `
      SELECT
        TRIM(p.product_code) AS product_code,
        p.product_price::numeric AS product_price
      FROM products p
      WHERE ${visibleProductSql('p')}
        AND p.product_code IS NOT NULL
        AND TRIM(p.product_code) <> ''
        AND p.product_price IS NOT NULL
      ORDER BY p.product_code
      `,
      { type: QueryTypes.SELECT }
    );

    return rows
      .map((r) => ({
        product_code: String(r.product_code).trim(),
        product_price: parseFloat(r.product_price),
      }))
      .filter((r) => r.product_code && Number.isFinite(r.product_price));
  } finally {
    await sequelize.close();
  }
}

module.exports = {
  fetchVisibleCatalogPrices,
};
