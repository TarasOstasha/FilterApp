const { Op } = require('sequelize');

const HIDDEN_PRODUCT_FLAG = 'Y';

/** Sequelize where clause: visible catalog products only */
const visibleProductWhere = () => ({
  [Op.or]: [
    { hide_product: null },
    { hide_product: { [Op.ne]: HIDDEN_PRODUCT_FLAG } },
  ],
});

/** SQL predicate for raw queries, e.g. `(COALESCE(p.hide_product, '') <> 'Y')` */
const visibleProductSql = (alias = 'p') =>
  `(COALESCE(${alias}.hide_product, '') <> '${HIDDEN_PRODUCT_FLAG}')`;

/** Append to existing WHERE 1=1 blocks */
const VISIBLE_PRODUCT_SQL_AND = ` AND ${visibleProductSql('p')}`;

module.exports = {
  HIDDEN_PRODUCT_FLAG,
  visibleProductWhere,
  visibleProductSql,
  VISIBLE_PRODUCT_SQL_AND,
};
