class FilterField {
    static async getAll (limit, offset) {
        try {
          const query = `
            SELECT *
            FROM filter_fields
            ORDER BY id
          `;
          const { rows } = await FilterField.pool.query(query);
    
          return rows;
        } catch (err) {
          throw err;
        }
      }
}

module.exports = FilterField;