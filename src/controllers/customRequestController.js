const customRequestService = require('../services/customRequestService');
const { optionalUser, requireUser } = require('../middleware/auth');
const { assertObjectId, pagination, readBody } = require('../utils/http');

async function list(request) {
  await requireUser(request, ['admin']);
  return customRequestService.listCustomRequests(request.query || {}, pagination(request));
}

async function get(request) {
  const user = await optionalUser(request);
  const id = assertObjectId(request.query?.id);
  if (user?.role === 'admin') return customRequestService.getCustomRequest(id);
  return customRequestService.getCustomerRequest(
    id,
    request.headers?.['x-request-token'] || request.headers?.['X-Request-Token'],
  );
}

async function create(request) {
  return customRequestService.createCustomRequest(readBody(request));
}

async function update(request) {
  await requireUser(request, ['admin']);
  return customRequestService.updateCustomRequest(assertObjectId(request.query?.id), readBody(request));
}

async function createOrder(request) {
  const body = readBody(request);
  return customRequestService.createOrderFromQuote(
    assertObjectId(request.query?.id),
    request.headers?.['x-request-token'] || request.headers?.['X-Request-Token'],
    body,
  );
}

module.exports = { create, createOrder, get, list, update };
