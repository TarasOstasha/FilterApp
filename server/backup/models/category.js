class Category {
    static async getAll (limit, offset) {
        try {
          const query = `
            SELECT *
            FROM Categories
            ORDER BY id
          `;
          const { rows } = await Category.pool.query(query);
    
          return rows;
        } catch (err) {
          throw err;
        }
      }
}

module.exports = Category;