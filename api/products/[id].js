const { createApiHandler } = require('../../src/app');
const controller = require('../../src/controllers/productController');

module.exports = createApiHandler({
  GET: controller.get,
  PATCH: controller.update,
  DELETE: controller.remove,
});
