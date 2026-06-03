const jwt = require('jsonwebtoken');
const createError = require('http-errors');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError(401, 'Authentication required'));
  }

  const token = authHeader.slice(7);

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return next(createError(401, 'Invalid or expired token'));
  }
};
