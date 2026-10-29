const controller = require('../controllers/productController');

module.exports = {
  GET: controller.list,
  POST: controller.create,
};
