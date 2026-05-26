const { Router } = require('express');
const imageProxyController = require('../controllers/imageProxyController');

const imageProxyRouter = Router();

imageProxyRouter.get('/', imageProxyController.proxyImage);

module.exports = imageProxyRouter;
