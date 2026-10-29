const customRequestService = require('../services/customRequestService');
const { requireUser } = require('../middleware/auth');
const { assertObjectId, pagination, readBody } = require('../utils/http');

async function list(request) {
  await requireUser(request, ['admin']);
  return customRequestService.listCustomRequests(request.query || {}, pagination(request));
}

async function get(request) {
  await requireUser(request, ['admin']);
  return customRequestService.getCustomRequest(assertObjectId(request.query?.id));
}

async function create(request) {
  return customRequestService.createCustomRequest(readBody(request));
}

async function update(request) {
  await requireUser(request, ['admin']);
  return customRequestService.updateCustomRequest(assertObjectId(request.query?.id), readBody(request));
}

module.exports = { create, get, list, update };
