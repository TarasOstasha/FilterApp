const { Router } = require('express');
const { embedSettingsController } = require('../controllers');
const { verifyJwt } = require('../middleware');

const embedSettingsRouter = Router();

embedSettingsRouter.get('/', embedSettingsController.getEmbedSettings);
embedSettingsRouter.put('/', verifyJwt, embedSettingsController.updateEmbedSettings);

module.exports = embedSettingsRouter;
