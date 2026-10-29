const Category = require('../models/Category');
const CustomRequest = require('../models/CustomRequest');
const { canTransition, requestTransitions } = require('../domain/statusTransitions');
const { AppError } = require('../utils/errors');
const { pageResult } = require('../utils/http');

async function listCustomRequests(query, pagination) {
  const filter = {};
  if (query.status) {
    if (!Object.hasOwn(requestTransitions, query.status)) throw new AppError('Custom request status is invalid.');
    filter.status = query.status;
  }
  const [items, total] = await Promise.all([
    CustomRequest.find(filter)
      .populate({ path: 'category', select: 'name' })
      .sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    CustomRequest.countDocuments(filter),
  ]);
  return pageResult(items, total, pagination.page, pagination.limit);
}

async function getCustomRequest(id) {
  const request = await CustomRequest.findById(id).lean();
  if (!request) throw new AppError('Custom request not found.', 404);
  return request;
}

async function createCustomRequest(input) {
  const category = await Category.findOne({ _id: input.category, status: 'visible' }).select('_id').lean();
  if (!category) throw new AppError('The selected category does not exist or is hidden.');
  return CustomRequest.create({
    customer: {
      name: input.customer?.name,
      phone: input.customer?.phone,
      email: input.customer?.email || '',
    },
    productName: input.productName,
    category: input.category,
    budget: input.budget,
    requestedColors: input.requestedColors,
    description: input.description,
  });
}

async function updateCustomRequest(id, input) {
  const request = await CustomRequest.findById(id);
  if (!request) throw new AppError('Custom request not found.', 404);

  if (input.quoteMessage !== undefined) request.quoteMessage = input.quoteMessage;
  if (input.quotedPrice !== undefined) request.quotedPrice = input.quotedPrice;
  if (input.rejectionReason !== undefined) request.rejectionReason = input.rejectionReason;

  if (input.status !== undefined) {
    if (!canTransition(requestTransitions, request.status, input.status)) {
      throw new AppError(`Custom request cannot move from ${request.status} to ${input.status}.`, 409);
    }
    if (input.status === 'quoted' && (!request.quoteMessage.trim() || request.quotedPrice === null)) {
      throw new AppError('A quote message and quoted price are required before sending a quote.');
    }
    if (input.status === 'rejected' && !request.rejectionReason.trim()) {
      throw new AppError('A rejection reason is required.');
    }
    request.status = input.status;
  }

  await request.save();
  return request;
}

module.exports = { createCustomRequest, getCustomRequest, listCustomRequests, updateCustomRequest };
