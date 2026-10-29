const { createApiHandler } = require('../../src/app');
const controller = require('../../src/controllers/categoryController');

module.exports = createApiHandler({
  PATCH: controller.update,
  DELETE: controller.remove,
});
