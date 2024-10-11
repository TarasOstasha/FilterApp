class Product {
  static async getAll(limit, offset) {
    try {
      const query = `
            SELECT *
            FROM Products
            ORDER BY id
            LIMIT $1 OFFSET $2
          `
      const { rows } = await Product.pool.query(query, [limit, offset])

      return rows
    } catch (err) {
      throw err
    }
  }

  static async getFilteredProducts(limit, offset, filters = {}) {
    try {
      let query = `
          SELECT *
          FROM Products
          WHERE 1=1`; // 1=1 is a simple way to append dynamic conditions
  
      const values = [limit, offset];
      let index = 3; // Start indexing for additional parameters from 3 because limit and offset use $1 and $2
  
      // Loop through filters dynamically based on their keys
      Object.keys(filters).forEach((filterKey) => {
        if (filters[filterKey]) {
          query += ` AND ${filterKey} IN (${filters[filterKey]
            .map(() => `$${index++}`)
            .join(',')})`;
          values.push(...filters[filterKey]);
        }
      });
  
      // Add pagination
      query += `
          ORDER BY id
          LIMIT $1 OFFSET $2`;
  
      // Execute the query
      const { rows } = await Product.pool.query(query, values);
      return rows;
    } catch (err) {
      throw err;
    }
  }
  

  // static async getFilteredProducts(limit, offset, filters = {}) {
  //   try {
  //     let query = `
  //         SELECT *
  //         FROM Products
  //         WHERE 1=1` // 1=1 is a simple way to append dynamic conditions

  //     const values = [limit, offset]
  //     let index = 3 // Start indexing for additional parameters from 3 because limit and offset use $1 and $2

  //     // Dynamically append conditions based on provided filters
  //     if (filters.productType) {
  //       query += ` AND product_type IN (${filters.productType
  //         .map(() => `$${index++}`)
  //         .join(',')})`
  //       values.push(...filters.productType) // Append filter values to the `values` array
  //     }

  //     if (filters.graphicFinish) {
  //       query += ` AND graphic_finish IN (${filters.graphicFinish
  //         .map(() => `$${index++}`)
  //         .join(',')})`
  //       values.push(...filters.graphicFinish)
  //     }

  //     if (filters.frameType) {
  //       query += ` AND frame_type IN (${filters.frameType
  //         .map(() => `$${index++}`)
  //         .join(',')})`
  //       values.push(...filters.frameType)
  //     }

  //     if (filters.displayShape) {
  //       query += ` AND display_shape IN (${filters.displayShape
  //         .map(() => `$${index++}`)
  //         .join(',')})`
  //       values.push(...filters.displayShape)
  //     }

  //     if (filters.displayHeight) {
  //       query += ` AND display_height IN (${filters.displayHeight
  //         .map(() => `$${index++}`)
  //         .join(',')})`
  //       values.push(...filters.displayHeight)
  //     }

  //     if (filters.displayWidth) {
  //       query += ` AND display_width IN (${filters.displayWidth
  //         .map(() => `$${index++}`)
  //         .join(',')})`
  //       values.push(...filters.displayWidth)
  //     }

  //     // Add pagination
  //     query += `
  //         ORDER BY id
  //         LIMIT $1 OFFSET $2`

  //     // Execute the query
  //     const { rows } = await Product.pool.query(query, values)
  //     return rows
  //   } catch (err) {
  //     throw err
  //   }
  // }
}

module.exports = Product
