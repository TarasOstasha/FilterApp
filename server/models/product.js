class Product {
    static async getAll (limit, offset) {
        try {
          const query = `
            SELECT *
            FROM Products
            ORDER BY id
            LIMIT $1 OFFSET $2
          `;
          const { rows } = await Product.pool.query(query,[limit, offset]);

          return rows;
        } catch (err) {
          throw err;
        }
      }
}

module.exports = Product;