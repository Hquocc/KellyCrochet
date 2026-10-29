const { createApiHandler } = require('../../src/app');
const controller = require('../../src/controllers/orderController');

module.exports = createApiHandler({
  GET: controller.get,
  PATCH: controller.updateStatus,
});
