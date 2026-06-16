const { Router } = require('express');
const { filterFieldController, filterFieldAdminController } = require('../controllers');


// app.get('/filterField', filterFieldController.getAllFilterFields);


const filterFieldsRouter = Router();

filterFieldsRouter
  .route('/')
  .get(filterFieldController.getAllFilterFields)
  .post(filterFieldAdminController.create);

filterFieldsRouter
  .route('/by-id/:id')
  .get(filterFieldAdminController.getById)
  .put(filterFieldAdminController.updateById)
  .delete(filterFieldAdminController.deleteById);






module.exports = filterFieldsRouter;