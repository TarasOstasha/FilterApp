// class Product {
//   static async getAll(limit, offset) {
//     try {
//       const query = `
//             SELECT *
//             FROM Products
//             ORDER BY id
//             LIMIT $1 OFFSET $2
//           `
//       const { rows } = await Product.pool.query(query, [limit, offset])

//       return rows
//     } catch (err) {
//       throw err
//     }
//   }

//   static async getFilteredProducts(limit, offset, filters = {}) {
//     try {
//       let query = `
//           SELECT *
//           FROM Products
//           WHERE 1=1`; // 1=1 is a simple way to append dynamic conditions

//       const values = [limit, offset];
//       let index = 3; // Start indexing for additional parameters from 3 because limit and offset use $1 and $2

//       // Loop through filters dynamically based on their keys
//       Object.keys(filters).forEach((filterKey) => {
//         if (filters[filterKey]) {
//           query += ` AND ${filterKey} IN (${filters[filterKey]
//             .map(() => `$${index++}`)
//             .join(',')})`;
//           values.push(...filters[filterKey]);
//         }
//       });

//       // Add pagination
//       query += `
//           ORDER BY id
//           LIMIT $1 OFFSET $2`;

//       // Execute the query
//       const { rows } = await Product.pool.query(query, values);
//       return rows;
//     } catch (err) {
//       throw err;
//     }
//   }

//   // static async getFilteredProducts(limit, offset, filters = {}) {
//   //   try {
//   //     let query = `
//   //         SELECT *
//   //         FROM Products
//   //         WHERE 1=1` // 1=1 is a simple way to append dynamic conditions

//   //     const values = [limit, offset]
//   //     let index = 3 // Start indexing for additional parameters from 3 because limit and offset use $1 and $2

//   //     // Dynamically append conditions based on provided filters
//   //     if (filters.productType) {
//   //       query += ` AND product_type IN (${filters.productType
//   //         .map(() => `$${index++}`)
//   //         .join(',')})`
//   //       values.push(...filters.productType) // Append filter values to the `values` array
//   //     }

//   //     if (filters.graphicFinish) {
//   //       query += ` AND graphic_finish IN (${filters.graphicFinish
//   //         .map(() => `$${index++}`)
//   //         .join(',')})`
//   //       values.push(...filters.graphicFinish)
//   //     }

//   //     if (filters.frameType) {
//   //       query += ` AND frame_type IN (${filters.frameType
//   //         .map(() => `$${index++}`)
//   //         .join(',')})`
//   //       values.push(...filters.frameType)
//   //     }

//   //     if (filters.displayShape) {
//   //       query += ` AND display_shape IN (${filters.displayShape
//   //         .map(() => `$${index++}`)
//   //         .join(',')})`
//   //       values.push(...filters.displayShape)
//   //     }

//   //     if (filters.displayHeight) {
//   //       query += ` AND display_height IN (${filters.displayHeight
//   //         .map(() => `$${index++}`)
//   //         .join(',')})`
//   //       values.push(...filters.displayHeight)
//   //     }

//   //     if (filters.displayWidth) {
//   //       query += ` AND display_width IN (${filters.displayWidth
//   //         .map(() => `$${index++}`)
//   //         .join(',')})`
//   //       values.push(...filters.displayWidth)
//   //     }

//   //     // Add pagination
//   //     query += `
//   //         ORDER BY id
//   //         LIMIT $1 OFFSET $2`

//   //     // Execute the query
//   //     const { rows } = await Product.pool.query(query, values)
//   //     return rows
//   //   } catch (err) {
//   //     throw err
//   //   }
//   // }
// }
const chalk = require('chalk')
class Product {
  static async getAll(limit, offset, sortBy) {
    try {
      let orderByClause = 'ORDER BY product_price ASC'

      if (sortBy === 'price_desc') {
        orderByClause = 'ORDER BY product_price DESC' // Switch to descending order
      } else if (sortBy === 'price_asc') {
        orderByClause = 'ORDER BY product_price ASC' // Explicit ascending order
      }

      const query = `
        SELECT *
        FROM Products
         ${orderByClause}
        LIMIT $1 OFFSET $2
      `
      const { rows } = await Product.pool.query(query, [limit, offset])
      return rows
    } catch (err) {
      throw err
    }
  }

  static async getFilteredProducts(
    limit,
    offset,
    filters = {},
    sortBy = 'price_asc',
  ) {
    try {
      let query = `
            SELECT p.*
            FROM Products p
            JOIN product_filters pf ON p.id = pf.product_id
            JOIN filter_fields ff ON pf.filter_field_id = ff.id
            WHERE 1=1
        `

      const values = [limit, offset]
      let index = 3 // Index starts at 3 because $1 and $2 are reserved for limit and offset

      // Loop through filters and dynamically append conditions
      Object.keys(filters).forEach((filterField) => {
        const filterValues = Array.isArray(filters[filterField])
          ? filters[filterField]
          : [filters[filterField]] // Ensure filter values are in an array

        // Map filters to their corresponding field in filter_fields table
        query += ` AND ff.field_name = $${index++} AND pf.filter_value IN (${filterValues
          .map(() => `$${index++}`)
          .join(',')})`

        // Push filter field name and values to the query parameters
        values.push(filterField)
        values.push(...filterValues)
      })

      console.log(chalk.red(sortBy))
      if (sortBy === 'price_asc') {
        query += ` ORDER BY product_price ASC`
      } else if (sortBy === 'price_desc') {
        query += ` ORDER BY product_price DESC`
      } else if (sortBy === 'title') {
        query += ` ORDER BY product_name ASC`
      } else if (sortBy === 'manufacturer') {
        query += ` ORDER BY manufacturer ASC` // Assuming you have a manufacturer column
      } else if (sortBy === 'newest') {
        query += ` ORDER BY created_at DESC` // Assuming you have a created_at column
      } else if (sortBy === 'oldest') {
        query += ` ORDER BY created_at ASC` // Assuming you have a created_at column
      } else {
        query += ` ORDER BY id `
      }

      // Pagination should be at the end
      query += `
           
            LIMIT $1 OFFSET $2
        `

      // Execute the query
      const { rows } = await Product.pool.query(query, values)
      return rows
    } catch (err) {
      throw err
    }
  }

  static async getTotalCount(filters = {}) {
    try {
      let query = `
        SELECT COUNT(*)
        FROM Products
        WHERE 1=1
      `
      const values = []
      let index = 1

      // Same filter logic applied to count query
      Object.keys(filters).forEach((filterField) => {
        const filterValues = Array.isArray(filters[filterField])
          ? filters[filterField]
          : [filters[filterField]] // Wrap in array if it's a single value

        query += ` AND ${filterField} IN (${filterValues
          .map(() => `$${index++}`)
          .join(',')})`
        values.push(...filterValues)
      })

      const { rows } = await Product.pool.query(query, values)
      return rows[0].count // Return total count
    } catch (err) {
      throw err
    }
  }
}

module.exports = Product
