const categoryService = require('../services/categoryService');
const { optionalUser, requireUser } = require('../middleware/auth');
const { assertObjectId, pagination, readBody } = require('../utils/http');

async function list(request) {
  const user = await optionalUser(request);
  const includeHidden = user?.role === 'admin';
  return categoryService.listCategories(pagination(request), includeHidden);
}

async function create(request) {
  await requireUser(request, ['admin']);
  return categoryService.createCategory(readBody(request));
}

async function update(request) {
  await requireUser(request, ['admin']);
  return categoryService.updateCategory(assertObjectId(request.query?.id), readBody(request));
}

async function remove(request) {
  await requireUser(request, ['admin']);
  await categoryService.deleteCategory(assertObjectId(request.query?.id));
  return { deleted: true };
}

module.exports = { create, list, remove, update };
