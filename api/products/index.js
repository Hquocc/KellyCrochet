const { createApiHandler } = require('../../src/app');
const routes = require('../../src/routes/productRoutes');

module.exports = createApiHandler(routes);
