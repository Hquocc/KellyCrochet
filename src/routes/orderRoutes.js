const controller = require('../controllers/orderController');

module.exports = {
  GET: controller.list,
  POST: controller.create,
};
