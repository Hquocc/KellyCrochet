const { createApiHandler } = require('../../src/app');
const controller = require('../../src/controllers/authController');

module.exports = createApiHandler({ GET: controller.me });
