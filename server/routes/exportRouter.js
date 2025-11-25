const { Router } = require('express');
const { exportController } = require('../controllers');



const exportRouter = Router();

// Dynamic export route based on type
exportRouter
    .get('/:type', exportController.exportData);

module.exports = exportRouter;
