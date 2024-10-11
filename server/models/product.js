class Product {
    static async getAll (limit, offset) {
        try {
          const query = `
            SELECT *
            FROM Products
            ORDER BY id
          `;
          const { rows } = await Product.pool.query(query);
    
          return rows;
        } catch (err) {
          throw err;
        }
      }
}

module.exports = Product;