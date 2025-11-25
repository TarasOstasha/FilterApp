class Authentication {
    static async getUserByUsername(username) {
      try {
        const query = `
          SELECT * 
          FROM admin_users 
          WHERE username = $1
        `;
        const { rows } = await this.pool.query(query, [username]);       
        return rows[0];  
      } catch (err) {
        throw err;
      }
    }
  
    static async updateUserPassword(username, hashedPassword) {
      try {
        const query = `
          UPDATE admin_users 
          SET password = $1 
          WHERE username = $2
        `;
        await pool.query(query, [hashedPassword, username]);
      } catch (err) {
        throw err;
      }
    }
  }

module.exports = Authentication;




