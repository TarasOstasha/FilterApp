class ProductFilter {
    static async getAll (limit, offset) {
        try {
          const query = `
            SELECT *
            FROM product_filters
            ORDER BY product_id
          `;
          const { rows } = await ProductFilter.pool.query(query);
    
          return rows;
        } catch (err) {
          throw err;
        }
      }
}

module.exports = ProductFilter;