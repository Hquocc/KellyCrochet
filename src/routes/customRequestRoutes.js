const controller = require('../controllers/customRequestController');

module.exports = {
  GET: controller.list,
  POST: controller.create,
};
