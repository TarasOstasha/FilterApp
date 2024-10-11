const { Router } = require('express');
const { filterFieldController } = require('../controllers');


// app.get('/filterField', filterFieldController.getAllFilterFields);


const filterFieldsRouter = Router();

filterFieldsRouter
  .route('/')
  .get(filterFieldController.getAllFilterFields)
  //.post(usersController.createUser);






module.exports = filterFieldsRouter;