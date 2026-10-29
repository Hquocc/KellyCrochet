const { createApiHandler } = require('../../src/app');
const routes = require('../../src/routes/customRequestRoutes');

module.exports = createApiHandler(routes);
