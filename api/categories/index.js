const { createApiHandler } = require('../../src/app');
const routes = require('../../src/routes/categoryRoutes');

module.exports = createApiHandler(routes);
