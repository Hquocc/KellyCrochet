const orderService = require('../services/orderService');
const { requireUser } = require('../middleware/auth');
const { AppError } = require('../utils/errors');
const { assertObjectId, pagination, readBody } = require('../utils/http');

async function list(request) {
  await requireUser(request, ['admin']);
  return orderService.listOrders(request.query || {}, pagination(request));
}

async function get(request) {
  await requireUser(request, ['admin']);
  return orderService.getOrder(assertObjectId(request.query?.id));
}

async function create(request) {
  return orderService.createOrder(readBody(request));
}

async function updateStatus(request) {
  await requireUser(request, ['admin']);
  const { status } = readBody(request);
  if (typeof status !== 'string') throw new AppError('An order status is required.');
  return orderService.updateOrderStatus(assertObjectId(request.query?.id), status);
}

module.exports = { create, get, list, updateStatus };
