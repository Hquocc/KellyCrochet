const { createApiHandler } = require('../../src/app');
const routes = require('../../src/routes/orderRoutes');

module.exports = createApiHandler(routes);
