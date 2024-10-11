const yup = require('yup');

module.exports.PAGE_VALIDATION_SCHEMA = yup.number().min(1, "Page must be at least 1").integer("Page must be an integer");
module.exports.RESULTS_VALIDATION_SCHEMA = yup
  .number()
  .min(27, "Minimum results per page is 27")
  .max(270, "Maximum results per page is 270")
  .integer("Results per page must be an integer");