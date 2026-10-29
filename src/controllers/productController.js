const productService = require('../services/productService');
const { optionalUser, requireUser } = require('../middleware/auth');
const { assertObjectId, pagination, readBody } = require('../utils/http');

async function list(request) {
  const user = await optionalUser(request);
  return productService.listProducts(request.query || {}, pagination(request), user?.role === 'admin');
}

async function get(request) {
  const user = await optionalUser(request);
  return productService.getProduct(assertObjectId(request.query?.id), user?.role === 'admin');
}

async function create(request) {
  await requireUser(request, ['admin']);
  return productService.createProduct(readBody(request));
}

async function update(request) {
  await requireUser(request, ['admin']);
  return productService.updateProduct(assertObjectId(request.query?.id), readBody(request));
}

async function remove(request) {
  await requireUser(request, ['admin']);
  await productService.deleteProduct(assertObjectId(request.query?.id));
  return { deleted: true };
}

module.exports = { create, get, list, remove, update };
