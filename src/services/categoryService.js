const Category = require('../models/Category');
const CustomRequest = require('../models/CustomRequest');
const Product = require('../models/Product');
const { invalidateCategoryCache } = require('./productService');
const { AppError } = require('../utils/errors');
const { pageResult } = require('../utils/http');

async function listCategories(pagination, includeHidden) {
  const filter = includeHidden ? {} : { status: 'visible' };
  const [items, total] = await Promise.all([
    Category.find(filter).sort({ name: 1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    Category.countDocuments(filter),
  ]);
  return pageResult(items, total, pagination.page, pagination.limit);
}

async function createCategory(input) {
  const created = await Category.create({
    name: input.name,
    description: input.description || '',
    status: input.status || 'visible',
  });
  invalidateCategoryCache();
  return created;
}

async function updateCategory(id, input) {
  const category = await Category.findById(id);
  if (!category) throw new AppError('Category not found.', 404);
  if (Object.hasOwn(input, 'name')) category.name = input.name;
  if (Object.hasOwn(input, 'description')) category.description = input.description;
  if (Object.hasOwn(input, 'status')) category.status = input.status;
  await category.save();
  invalidateCategoryCache();
  return category;
}

async function deleteCategory(id) {
  const [hasProducts, hasRequests] = await Promise.all([
    Product.exists({ category: id }),
    CustomRequest.exists({ category: id }),
  ]);
  if (hasProducts || hasRequests) {
    throw new AppError('A category referenced by products or custom requests cannot be deleted.', 409);
  }

  const category = await Category.findByIdAndDelete(id);
  if (!category) throw new AppError('Category not found.', 404);
  invalidateCategoryCache();
}

module.exports = { createCategory, deleteCategory, listCategories, updateCategory };
