const request = require('supertest');
const app = require('../../app');

/**
 * Supertest agent bound to the Express app exported from app.js.
 * Does not call listen(); safe for API and integration tests.
 */
function getTestAgent() {
  return request(app);
}

module.exports = {
  app,
  getTestAgent,
  request: getTestAgent,
};
