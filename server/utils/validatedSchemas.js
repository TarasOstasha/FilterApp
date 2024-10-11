const yup = require('yup');

module.exports.PAGE_VALIDATION_SCHEMA = yup.number().min(1).integer();
module.exports.RESULTS_VALIDATION_SCHEMA = yup
  .number()
  .min(27)
  .max(270)
  .integer();