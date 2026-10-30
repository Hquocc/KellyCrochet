const Category = require('../models/Category');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { AppError } = require('../utils/errors');
const { pageResult } = require('../utils/http');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// In-memory cache cho danh mục hiển thị (tránh hit MongoDB liên tục ở mỗi request xem sản phẩm)
let visibleCategoriesCache = null;
let visibleCategoriesExpiry = 0;

async function getVisibleCategories() {
  const now = Date.now();
  if (visibleCategoriesCache && now < visibleCategoriesExpiry) {
    return visibleCategoriesCache;
  }
  visibleCategoriesCache = await Category.find({ status: 'visible' }).distinct('_id');
  visibleCategoriesExpiry = now + 60000; // 60 giây TTL
  return visibleCategoriesCache;
}

function invalidateCategoryCache() {
  visibleCategoriesCache = null;
  visibleCategoriesExpiry = 0;
}

async function listProducts(query, pagination, includeHidden) {
  const filter = {};
  if (!includeHidden) {
    const visibleCategories = await getVisibleCategories();
    filter.status = 'selling';
    filter.category = query.category
      ? { $in: visibleCategories, $eq: query.category }
      : { $in: visibleCategories };
  } else if (query.category) {
    filter.category = query.category;
  }
  if (query.search) filter.name = new RegExp(escapeRegex(String(query.search).slice(0, 100)), 'i');

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate({ path: 'category', select: 'name status' })
      .sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    Product.countDocuments(filter),
  ]);
  return pageResult(items, total, pagination.page, pagination.limit);
}

async function getProduct(id, includeHidden) {
  const filter = { _id: id };
  if (!includeHidden) filter.status = 'selling';
  const product = await Product.findOne(filter)
    .populate({ path: 'category', select: 'name status' })
    .lean();
  if (!product) throw new AppError('Product not found.', 404);
  if (!includeHidden && !(await Category.exists({ _id: product.category?._id, status: 'visible' }))) {
    throw new AppError('Product not found.', 404);
  }
  return product;
}

async function assertCategory(categoryId) {
  const category = await Category.findOne({ _id: categoryId, status: 'visible' }).select('_id').lean();
  if (!category) throw new AppError('The selected category does not exist or is hidden.');
}

async function createProduct(input) {
  await assertCategory(input.category);
  return Product.create({
    name: input.name,
    price: input.price,
    images: input.images,
    category: input.category,
    description: input.description,
    colors: input.colors,
    quantity: input.quantity,
  });
}

async function updateProduct(id, input) {
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found.', 404);

  const fields = ['name', 'price', 'images', 'category', 'description', 'colors', 'quantity'];
  for (const field of fields) {
    if (Object.hasOwn(input, field)) product[field] = input[field];
  }
  if (Object.hasOwn(input, 'category') && String(input.category) !== String(product.category)) {
    await assertCategory(input.category);
  }
  await product.save();
  return product;
}

async function deleteProduct(id) {
  const hasOrders = await Order.exists({ 'items.productId': id });
  if (hasOrders) throw new AppError('A product referenced by an order cannot be deleted.', 409);

  const product = await Product.findByIdAndDelete(id);
  if (!product) throw new AppError('Product not found.', 404);
}

module.exports = {
  createProduct,
  deleteProduct,
  getProduct,
  invalidateCategoryCache,
  listProducts,
  updateProduct,
};
