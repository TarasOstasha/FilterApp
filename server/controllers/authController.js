const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const createError = require('http-errors')
const { Authentication } = require('../models')

require('dotenv').config()

module.exports.login = async (req, res, next) => {
  const { username, password } = req.body
  console.log(username, password);
  try {
    const admin = await Authentication.getUserByUsername(username)
   
    if (!admin) {
      return next(createError(401, 'Invalid username or password'))
    }

    // Validate password
    const validPassword = await bcrypt.compare(password, admin.password)
    if (!validPassword) {
      return next(createError(401, 'Invalid username or password'))
    }
    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
    )
    return res.status(200).json({ token })
  } 
  catch (error) {
    return next(createError(500, 'Server error'))
  }
}

module.exports.changePassword = async (req, res, next) => {
  const { username, oldPassword, newPassword } = req.body

  try {
    // Fetch user from database using the model
    const admin = await Authentication.getUserByUsername(username)

    if (!admin) {
      return next(createError(404, 'Admin user not found'))
    }

    // Validate old password
    const validPassword = await bcrypt.compare(oldPassword, admin.password)
    if (!validPassword) {
      return next(createError(401, 'Incorrect old password'))
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    // Update password in database using the model
    await Authentication.updateUserPassword(username, hashedPassword)

    return res.status(200).json({ message: 'Password changed successfully' })
  } catch (error) {
    return next(createError(500, 'Server error'))
  }
}
