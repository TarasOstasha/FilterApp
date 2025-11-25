const { Router } = require('express');
const { authController } = require('../controllers');
const authRouter = Router();

authRouter.post('/login', authController.login);
authRouter.post('/change-password', authController.changePassword);

module.exports = authRouter;




