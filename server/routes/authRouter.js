const { Router } = require('express');
const { authController } = require('../controllers');
const { optionalVerifyJwt } = require('../middleware');
const authRouter = Router();

authRouter.post('/login', authController.login);
authRouter.post('/change-password', optionalVerifyJwt, authController.changePassword);

module.exports = authRouter;




