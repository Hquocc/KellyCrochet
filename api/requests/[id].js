const { createApiHandler } = require('../../src/app');
const controller = require('../../src/controllers/customRequestController');

module.exports = createApiHandler({
  GET: controller.get,
  PATCH: controller.update,
  POST: controller.createOrder,
});
