const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.warn('JWT verification failed:', error.message);
    // Invalid token on login-page change-password: fall back to username in body
  }

  return next();
};
