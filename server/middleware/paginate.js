const { DEFAULT_PAGE, DEFAULT_RESULTS } = require('../utils/constants');
const { PAGE_VALIDATION_SCHEMA, RESULTS_VALIDATION_SCHEMA } = require('../utils/validatedSchemas');
  
  // TODO move to constants.js
//   const DEFAULT_PAGE = 1;
//   const DEFAULT_RESULTS = 27;
  
  module.exports.paginateProducts = async (req, res, next) => {
    let { page = DEFAULT_PAGE, results = DEFAULT_RESULTS } = req.query;
  
    page = (await PAGE_VALIDATION_SCHEMA.isValid(page)) ? page : DEFAULT_PAGE;
    results = (await RESULTS_VALIDATION_SCHEMA.isValid(results))
      ? results
      : DEFAULT_RESULTS;
      
  
    const limit = results;
    //const offset = (page - 1) * page;
    const offset = (page - 1) * results;
    req.pagination = { limit, offset };
    next();
  };
