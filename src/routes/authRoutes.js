const controller = require('../controllers/authController');

module.exports = {
  GET: controller.me,
  POST: controller.register,
};
