const { Sequelize, QueryTypes } = require('sequelize');
const config = require('../../config/config.js')[process.env.NODE_ENV || 'test'];
const { visibleProductSql } = require('../../utils/productVisibility');

const MEGA_LIMIT = 54;

const SORT_OPTIONS = ['most_popular', 'price_asc', 'price_desc'];

function createSequelize() {
  return new Sequelize(config.database, config.username, config.password, config);
}

/**
 * @param {string} sortBy
 */
function megaOrderClause(sortBy) {
  switch (sortBy) {
    case 'price_desc':
      return 'p.product_price DESC';
    case 'most_popular':
      return 'p.most_popular DESC';
    case 'price_asc':
    default:
      return 'p.product_price ASC';
  }
}

/**
 * Expected mega-filter results (same rules as getMegaFilteredProductItems).
 * @param {string} searchTerms
 * @param {string} sortBy
 * @param {string|number|null} categoryId
 */
async function expectedMegaProductsFromDb(searchTerms, sortBy, categoryId) {
  const words = String(searchTerms).split(' ').filter(Boolean);
  const replacements = {};
  let joins = '';

  if (categoryId != null) {
    joins += `
      JOIN product_categories pc
        ON pc.product_id = p.id
       AND pc.category_id = :catId
    `;
    replacements.catId = parseInt(String(categoryId), 10);
  }

  let where = `WHERE ${visibleProductSql('p')}`;
  words.forEach((word, index) => {
    const key = `w${index}`;
    replacements[key] = `%${word}%`;
    where += ` AND (p.product_name ILIKE :${key} OR p.product_code ILIKE :${key})`;
  });

  const order = megaOrderClause(sortBy);

  const sequelize = createSequelize();
  try {
    const rows = await sequelize.query(
      `
      SELECT p.id, p.product_code, p.product_name, p.product_price, p.most_popular
      FROM products p
      ${joins}
      ${where}
      ORDER BY ${order}
      LIMIT ${MEGA_LIMIT}
      `,
      { replacements, type: QueryTypes.SELECT }
    );

    return rows.map((r) => ({
      id: r.id,
      product_code: String(r.product_code ?? '').trim(),
      product_name: r.product_name,
      product_price: r.product_price != null ? parseFloat(r.product_price) : null,
      most_popular: r.most_popular != null ? parseFloat(r.most_popular) : null,
    }));
  } finally {
    await sequelize.close();
  }
}

/**
 * Pick multi-word search scenarios from visible catalog in categories.
 * @param {string[]} categoryIds
 * @param {number} [maxScenarios]
 */
async function discoverMultiWordMegaScenarios(categoryIds, maxScenarios = 3) {
  const sequelize = createSequelize();
  const scenarios = [];

  try {
    for (const categoryId of categoryIds) {
      if (scenarios.length >= maxScenarios) break;

      const rows = await sequelize.query(
        `
        SELECT p.product_code, p.product_name
        FROM products p
        JOIN product_categories pc ON pc.product_id = p.id AND pc.category_id = :catId
        WHERE ${visibleProductSql('p')}
          AND p.product_name IS NOT NULL
          AND TRIM(p.product_name) <> ''
          AND POSITION(' ' IN TRIM(p.product_name)) > 0
        ORDER BY p.product_code
        LIMIT 200
        `,
        { replacements: { catId: parseInt(String(categoryId), 10) }, type: QueryTypes.SELECT }
      );

      for (const row of rows) {
        const words = String(row.product_name)
          .trim()
          .split(/\s+/)
          .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
          .filter((w) => w.length >= 3);

        if (words.length < 2) continue;

        const searchTerms = `${words[0]} ${words[1]}`;
        const expected = await expectedMegaProductsFromDb(searchTerms, 'price_asc', categoryId);
        const matches = expected.some((p) => p.product_code === String(row.product_code).trim());
        if (!matches) continue;

        scenarios.push({
          kind: 'multi-word',
          label: `catId=${categoryId} | "${searchTerms}"`,
          categoryId,
          searchTerms,
        });
        break;
      }
    }

    if (scenarios.length < maxScenarios) {
      const rows = await sequelize.query(
        `
        SELECT p.product_code, p.product_name
        FROM products p
        WHERE ${visibleProductSql('p')}
          AND p.product_name IS NOT NULL
          AND TRIM(p.product_name) <> ''
          AND POSITION(' ' IN TRIM(p.product_name)) > 0
        ORDER BY p.product_code
        LIMIT 200
        `,
        { type: QueryTypes.SELECT }
      );

      for (const row of rows) {
        if (scenarios.length >= maxScenarios) break;
        const words = String(row.product_name)
          .trim()
          .split(/\s+/)
          .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
          .filter((w) => w.length >= 3);
        if (words.length < 2) continue;

        const searchTerms = `${words[0]} ${words[1]}`;
        const expected = await expectedMegaProductsFromDb(searchTerms, 'price_asc', null);
        if (!expected.length) continue;

        scenarios.push({
          kind: 'multi-word-global',
          label: `global | "${searchTerms}"`,
          categoryId: null,
          searchTerms,
        });
        break;
      }
    }
  } finally {
    await sequelize.close();
  }

  return scenarios;
}

module.exports = {
  MEGA_LIMIT,
  SORT_OPTIONS,
  expectedMegaProductsFromDb,
  discoverMultiWordMegaScenarios,
};
