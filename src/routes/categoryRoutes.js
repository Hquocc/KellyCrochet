const controller = require('../controllers/categoryController');

module.exports = {
  GET: controller.list,
  POST: controller.create,
};
