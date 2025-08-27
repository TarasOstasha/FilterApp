class ProductCategory {
    static async getAll (limit, offset) {
        try {
          const query = `
            SELECT *
            FROM product_categories
            ORDER BY product_id
          `;
          const { rows } = await ProductCategory.pool.query(query);
    
          return rows;
        } catch (err) {
          throw err;
        }
      }
}

module.exports = ProductCategory;