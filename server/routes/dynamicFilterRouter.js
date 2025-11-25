const { Router } = require('express');
const { dynamicFiltersController } = require('../controllers');

const dynamicFilterRouter = Router();

dynamicFilterRouter
  .route('/')
  .get(dynamicFiltersController.getDynamicFilters);

module.exports = dynamicFilterRouter;
