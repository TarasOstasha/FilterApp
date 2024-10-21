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

  // version 1
  // static async getFilteredProducts(
  //   limit,
  //   offset,
  //   filters = {},
  //   sortBy = 'price_asc',
  // ) {
  //   try {
  //     let query = `
  //           SELECT p.*
  //           FROM Products p
  //           JOIN product_filters pf ON p.id = pf.product_id
  //           JOIN filter_fields ff ON pf.filter_field_id = ff.id
  //           WHERE 1=1
  //       `

  //     const values = [limit, offset]
  //     let index = 3 // Index starts at 3 because $1 and $2 are reserved for limit and offset

  //     // Loop through filters and dynamically append conditions
  //     Object.keys(filters).forEach((filterField) => {
  //       const filterValues = Array.isArray(filters[filterField])
  //         ? filters[filterField]
  //         : [filters[filterField]] // Ensure filter values are in an array

  //       // Map filters to their corresponding field in filter_fields table
  //       query += ` AND ff.field_name = $${index++} AND pf.filter_value IN (${filterValues
  //         .map(() => `$${index++}`)
  //         .join(',')})`

  //       // Push filter field name and values to the query parameters
  //       values.push(filterField)
  //       values.push(...filterValues)
  //     })

  //     //console.log(chalk.red(sortBy))
  //     if (sortBy === 'price_asc') {
  //       query += ` ORDER BY product_price ASC`
  //     } else if (sortBy === 'price_desc') {
  //       query += ` ORDER BY product_price DESC`
  //     } else if (sortBy === 'title') {
  //       query += ` ORDER BY product_name ASC`
  //     } else if (sortBy === 'manufacturer') {
  //       query += ` ORDER BY manufacturer ASC` // Assuming you have a manufacturer column
  //     } else if (sortBy === 'newest') {
  //       query += ` ORDER BY created_at DESC` // Assuming you have a created_at column
  //     } else if (sortBy === 'oldest') {
  //       query += ` ORDER BY created_at ASC` // Assuming you have a created_at column
  //     } else {
  //       query += ` ORDER BY id `
  //     }

  //     // Pagination should be at the end
  //     query += `

  //           LIMIT $1 OFFSET $2
  //       `

  //     // Execute the query
  //     const { rows } = await Product.pool.query(query, values)
  //     return rows
  //   } catch (err) {
  //     throw err
  //   }
  // }
  // version 2
  // static async getFilteredProducts(
  //   limit,
  //   offset,
  //   filters = {},
  //   sortBy = 'product_price ASC',
  // ) {
  //   console.log(chalk.white('Filtered Params:', JSON.stringify(filters)))

  //   try {
  //     let query = `
  //           SELECT p.*
  //           FROM products p
  //           JOIN product_categories pc ON p.id = pc.product_id
  //           JOIN categories c ON pc.category_id = c.id
  //       `

  //     const values = [limit, offset]
  //     let filterConditions = []
  //     let filterCount = 0
  //     let index = 3 // starts at 3 because $1 is limit, $2 is offset

  //     //console.log(filters);
  //     // Check if category is in the filters and use 'category_name'
  //     if (filters.category) {
  //       //console.log(filters.category, '<< filters.category');
  //       filterConditions.push(`c.category_name = $${index}`)
  //       values.push(filters.category)
  //       //console.log(values, '<< values');
  //       index++
  //       filterCount++
  //     }
  //     console.log(filterConditions, '<< filterConditions')
  //     // Loop through other filters (e.g., Graphic Finish, Frame Type, etc.)
  //     if (Object.keys(filters).length > 0) {
  //       // Only join with product_filters if there are other filters
  //       query += `
  //               JOIN product_filters pf ON p.id = pf.product_id
  //               JOIN filter_fields ff ON pf.filter_field_id = ff.id
  //           `

  //       Object.keys(filters).forEach((filterField) => {
  //         if (filterField !== 'category') {
  //           const filterValues = Array.isArray(filters[filterField])
  //             ? filters[filterField]
  //             : [filters[filterField]] // Ensure filter values are in an array

  //           filterValues.forEach((value) => {
  //             filterConditions.push(
  //               `(ff.field_name = $${index} AND pf.filter_value = $${
  //                 index + 1
  //               })`,
  //             )
  //             values.push(filterField, value) // Add the filterField and filter value to the values array
  //             index += 2
  //           })

  //           filterCount++ // Track the number of filters for the HAVING clause
  //         }
  //       })
  //     }

  //     // Add filter conditions to the query
  //     // if (filterConditions.length > 0) {
  //     //     query += ` WHERE (${filterConditions.join(' OR ')})`;
  //     //     console.log(query += ` WHERE (${filterConditions.join(' OR ')})`);
  //     // }
  //     if (filterConditions.length > 0) {
  //       query += ` WHERE (${filterConditions.join(' OR ')})`
  //       // Log the final query without adding another WHERE clause
  //       //console.log(query);
  //     }

  //     // Group by product and ensure it matches the number of selected filters
  //     if (filterCount > 1) {
  //       query += `
  //               GROUP BY p.id
  //               HAVING COUNT(DISTINCT ff.field_name) = ${
  //                 filterCount - 1
  //               } -- excluding category filter
  //           `
  //     }

  //     query += `
  //           ORDER BY ${sortBy}
  //           LIMIT $1 OFFSET $2
  //       `
  //     console.log(query, '<< final query')
  //     console.log(values, '<< final values')
  //     // Execute the query
  //     const { rows } = await Product.pool.query(query, values)
  //     console.log(chalk.red(rows))
  //     return rows
  //   } catch (err) {
  //     throw err
  //   }
  // }

  // static async getFilteredProducts(
  //   limit,
  //   offset,
  //   filters = {},
  //   sortBy = 'price_asc'
  //   //sortBy = 'product_price ASC',
  // ) {
  //   console.log(chalk.white('Filtered Params:', JSON.stringify(filters), '<< filters'))

  //   try {
  //     let query = `
  //           SELECT p.*, c.category_name
  //           FROM products p
  //           JOIN product_categories pc ON p.id = pc.product_id
  //           JOIN categories c ON pc.category_id = c.id
  //       `
  //     const values = []
  //     let filterConditions = []
  //     let index = 1

  //     // Process filters
  //     if (Object.keys(filters).length > 0) {
  //       Object.keys(filters).forEach((filterField) => {
  //         const filterValues = Array.isArray(filters[filterField])
  //           ? filters[filterField]
  //           : [filters[filterField]] // Ensure filter values are in an array

  //         filterValues.forEach((value) => {
  //           if (filterField === 'category_name') {
  //             // Handle category filter
  //             filterConditions.push(`c.category_name = $${index}`)
  //             values.push(value)
  //             index++
  //           } else {
  //             // Handle other filters (if any)
  //             // Include joins with product_filters and filter_fields
  //             query += `
  //                           JOIN product_filters pf ON p.id = pf.product_id
  //                           JOIN filter_fields ff ON pf.filter_field_id = ff.id
  //                       `
  //             filterConditions.push(
  //               `(ff.field_name = $${index} AND pf.filter_value = $${
  //                 index + 1
  //               })`,
  //             )
  //             values.push(filterField, value)
  //             index += 2
  //           }
  //         })
  //       })
  //     }

  //     // Add filter conditions to the query
  //     if (filterConditions.length > 0) {
  //       query += ` WHERE ${filterConditions.join(' AND ')}`
  //     }

  //     // Add ORDER BY, LIMIT, and OFFSET clauses
  //     query += `
  //           ORDER BY ${sortBy}
  //           LIMIT $${index} OFFSET $${index + 1}
  //       `
  //     values.push(limit, offset)

  //     //console.log(query, '<< final query')
  //     console.log(values, '<< final values')

  //     // Execute the query
  //     const { rows } = await Product.pool.query(query, values)
  //     return rows
  //   } catch (err) {
  //     throw err
  //   }
  // }

  static async getFilteredProducts(
    limit,
    offset,
    filters = {},
    sortBy = 'price_asc',
  ) {
    console.log(
      chalk.white('Filtered Params:', JSON.stringify(filters), '<< filters'),
    )

    try {
      let query = `
        SELECT p.*, c.category_name
        FROM products p
        JOIN product_categories pc ON p.id = pc.product_id
        JOIN categories c ON pc.category_id = c.id
      `
      const values = []
      let filterConditions = []
      let index = 1

      // Define sort options mapping
      const sortOptions = {
        price_asc: 'product_price ASC',
        price_desc: 'product_price DESC',
        name_asc: 'p.product_name ASC',
        name_desc: 'p.product_name DESC',
        // Add more mappings as needed
      }

      // Validate sortBy
      if (sortOptions.hasOwnProperty(sortBy)) {
        sortBy = sortOptions[sortBy]
      } else {
        // Default to a safe sort option or handle the error
        sortBy = 'product_price ASC'
      }

      // Process filters
      if (Object.keys(filters).length > 0) {
        Object.keys(filters).forEach((filterField) => {
          const filterValues = Array.isArray(filters[filterField])
            ? filters[filterField]
            : [filters[filterField]] // Ensure filter values are in an array

          filterValues.forEach((value) => {
            if (filterField === 'category_name') {
              // Handle category filter
              filterConditions.push(`c.category_name = $${index}`)
              values.push(value)
              index++
            } else {
              // Handle other filters (if any)
              // Include joins with product_filters and filter_fields
              query += `
                JOIN product_filters pf ON p.id = pf.product_id
                JOIN filter_fields ff ON pf.filter_field_id = ff.id
              `
              filterConditions.push(
                `(ff.field_name = $${index} AND pf.filter_value = $${
                  index + 1
                })`,
              )
              values.push(filterField, value)
              index += 2
            }
          })
        })
      }

      // Add filter conditions to the query
      if (filterConditions.length > 0) {
        query += ` WHERE ${filterConditions.join(' AND ')}`
      }

      // Add ORDER BY, LIMIT, and OFFSET clauses
      query += `
        ORDER BY ${sortBy}
        LIMIT $${index} OFFSET $${index + 1}
      `
      values.push(limit, offset)

      // console.log(values, '<< final values');
      console.log(query, '<< final query ')
      // Execute the query
      const { rows } = await Product.pool.query(query, values)
      return rows
    } catch (err) {
      throw err
    }
  }

  // old version
  // static async getTotalCount(filters = {}) {
  //   try {
  //     let query = `
  //       SELECT COUNT(*)
  //       FROM Products
  //       WHERE 1=1
  //     `
  //     const values = []
  //     let index = 1

  //     // Same filter logic applied to count query
  //     Object.keys(filters).forEach((filterField) => {
  //       const filterValues = Array.isArray(filters[filterField])
  //         ? filters[filterField]
  //         : [filters[filterField]] // Wrap in array if it's a single value

  //       query += ` AND ${filterField} IN (${filterValues
  //         .map(() => `$${index++}`)
  //         .join(',')})`
  //       values.push(...filterValues)
  //     })

  //     const { rows } = await Product.pool.query(query, values)
  //     return rows[0].count // Return total count
  //   } catch (err) {
  //     throw err
  //   }
  // }
  // static async getTotalCount(filters = {}) {
  //   try {
  //     let query = `
  //       SELECT COUNT(DISTINCT p.id) AS total
  //       FROM products p
  //       LEFT JOIN product_categories pc ON p.id = pc.product_id
  //       LEFT JOIN categories c ON pc.category_id = c.id
  //     `;
  //     const values = [];
  //     const conditions = [];
  //     let index = 1;

  //     // Handle category filter separately
  //     if (filters.category) {
  //       conditions.push(`c.category_name = $${index}`);
  //       values.push(filters.category);
  //       index++;
  //     }

  //     // Handle other filters
  //     Object.keys(filters).forEach((filterField) => {
  //       if (filterField !== 'category') {
  //         const filterValues = Array.isArray(filters[filterField])
  //           ? filters[filterField]
  //           : [filters[filterField]]; // Wrap in array if it's a single value

  //         // Assuming other filters are columns in the products table
  //         conditions.push(
  //           `${filterField} IN (${filterValues.map(() => `$${index++}`).join(',')})`
  //         );
  //         values.push(...filterValues);
  //       }
  //     });

  //     // Add conditions to the query
  //     if (conditions.length > 0) {
  //       query += ` WHERE ${conditions.join(' AND ')}`;
  //     }

  //     console.log(query, '<< final query in getTotalCount');
  //     console.log(values, '<< final values in getTotalCount');

  //     const { rows } = await Product.pool.query(query, values);
  //     return parseInt(rows[0].total, 10); // Return total count as an integer
  //   } catch (err) {
  //     throw err;
  //   }
  // }

  static async getTotalCount(filters = {}) {
    try {
      let query = `
          SELECT COUNT(p.id) AS total
          FROM products p
          JOIN product_categories pc ON p.id = pc.product_id
          JOIN categories c ON pc.category_id = c.id
        `
      const values = []
      let filterConditions = []
      let index = 1

      // Process filters
      if (Object.keys(filters).length > 0) {
        Object.keys(filters).forEach((filterField) => {
          const filterValues = Array.isArray(filters[filterField])
            ? filters[filterField]
            : [filters[filterField]]

          filterValues.forEach((value) => {
            if (filterField === 'category_name') {
              // Handle category filter
              filterConditions.push(`c.category_name = $${index}`)
              values.push(value)
              index++
            } else {
              // Handle other filters (if any)
              query += `
                            JOIN product_filters pf ON p.id = pf.product_id
                            JOIN filter_fields ff ON pf.filter_field_id = ff.id
                        `
              filterConditions.push(
                `(ff.field_name = $${index} AND pf.filter_value = $${
                  index + 1
                })`,
              )
              values.push(filterField, value)
              index += 2
            }
          })
        })
      }

      // Add filter conditions to the query
      if (filterConditions.length > 0) {
        query += ` WHERE ${filterConditions.join(' AND ')}`
      }

      // console.log(query, '<< final query in getTotalCount')
      // console.log(values, '<< final values in getTotalCount')

      const { rows } = await Product.pool.query(query, values)
      console.log(rows[0].total)
      return parseInt(rows[0].total, 10) // Return total count as an integer
    } catch (err) {
      throw err
    }
  }

  static async getMegaFilteredProducts(
    sortBy = 'price_asc',
    searchTerms,
    limit,
  ) {
    const searchWords = searchTerms.split(' ').filter(Boolean)
    try {
      let orderByClause = 'ORDER BY product_price ASC'

      if (sortBy === 'price_desc') {
        orderByClause = 'ORDER BY product_price DESC'
      } else if (sortBy === 'price_asc') {
        orderByClause = 'ORDER BY product_price ASC'
      }
      const whereClause = searchWords
        .map((_, index) => `product_name ILIKE $${index + 1}`)
        .join(' AND ')
      // Use parameterized query to avoid SQL injection
      // const query = `
      //       SELECT *
      //       FROM Products
      //       WHERE product_name ILIKE $1
      //       ${orderByClause}
      //       LIMIT $2
      //   `
      const query = `
          SELECT *
          FROM Products
          WHERE ${whereClause}
          ${orderByClause}
          LIMIT $${
            searchWords.length + 1
          }  
      `
      // Use '%' wildcards in the parameterized query
      // const { rows } = await Product.pool.query(query, [
      //   `%${searchTerms}%`, // searchTerms goes as $1
      //   limit, // limit goes as $2
      // ])
      // Prepare the parameters for the query
      const params = searchWords.map(word => `%${word}%`);
      params.push(limit); // Add the limit as the last parameter
      const { rows } = await Product.pool.query(query, params);
      return rows
    } catch (err) {
      throw err
    }
  }
}

module.exports = Product
