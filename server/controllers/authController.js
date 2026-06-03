const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const createError = require('http-errors')
//const { Authentication } = require('../models')
const { AdminUser } = require('../models');

require('dotenv').config()

// module.exports.login = async (req, res, next) => {
//   const { username, password } = req.body
//   console.log(username, password);
//   try {
//     const admin = await Authentication.getUserByUsername(username)
   
//     if (!admin) {
//       return next(createError(401, 'Invalid username or password'))
//     }

//     // Validate password
//     const validPassword = await bcrypt.compare(password, admin.password)
//     if (!validPassword) {
//       return next(createError(401, 'Invalid username or password'))
//     }
//     // Generate JWT token
//     const token = jwt.sign(
//       { id: admin.id, username: admin.username },
//       process.env.JWT_SECRET,
//       { expiresIn: '1h' },
//     )
//     return res.status(200).json({ token })
//   } 
//   catch (error) {
//     return next(createError(500, 'Server error'))
//   }
// }

// module.exports.changePassword = async (req, res, next) => {
//   const { username, oldPassword, newPassword } = req.body

//   try {
//     // Fetch user from database using the model
//     const admin = await Authentication.getUserByUsername(username)

//     if (!admin) {
//       return next(createError(404, 'Admin user not found'))
//     }

//     // Validate old password
//     const validPassword = await bcrypt.compare(oldPassword, admin.password)
//     if (!validPassword) {
//       return next(createError(401, 'Incorrect old password'))
//     }

//     // Hash new password
//     const salt = await bcrypt.genSalt(10)
//     const hashedPassword = await bcrypt.hash(newPassword, salt)

//     // Update password in database using the model
//     await Authentication.updateUserPassword(username, hashedPassword)

//     return res.status(200).json({ message: 'Password changed successfully' })
//   } catch (error) {
//     return next(createError(500, 'Server error'))
//   }
// }


module.exports.login = async (req, res, next) => {
  const { username, password } = req.body;
  console.log(username, password);
  try {
    // 1) Find user by username
    const admin = await AdminUser.findOne({ where: { username } });

    if (!admin) {
      return next(createError(401, 'Invalid username or password'));
    }

    // 2) Validate password
    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return next(createError(401, 'Invalid username or password'));
    }

    // 3) Generate JWT token
    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    return res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    return next(createError(500, 'Server error'));
  }
};

module.exports.changePassword = async (req, res, next) => {
  const { username: bodyUsername, oldPassword, newPassword } = req.body;
  const username = req.user?.username || bodyUsername;

  if (!username) {
    return next(createError(400, 'Username is required'));
  }

  if (!oldPassword || !newPassword) {
    return next(createError(400, 'Old password and new password are required'));
  }

  if (typeof oldPassword !== 'string' || typeof newPassword !== 'string') {
    return next(createError(400, 'Invalid password format'));
  }

  if (newPassword.length < 6 || newPassword.length > 20) {
    return next(createError(400, 'New password must be between 6 and 20 characters'));
  }

  if (oldPassword === newPassword) {
    return next(createError(400, 'New password must be different from the old password'));
  }

  try {
    const admin = await AdminUser.findOne({ where: { username } });

    if (!admin) {
      return next(createError(404, 'Admin user not found'));
    }

    const validPassword = await bcrypt.compare(oldPassword, admin.password);
    if (!validPassword) {
      return next(createError(401, 'Incorrect old password'));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await AdminUser.update(
      { password: hashedPassword },
      { where: { username } }
    );

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    return next(createError(500, 'Server error'));
  }
};