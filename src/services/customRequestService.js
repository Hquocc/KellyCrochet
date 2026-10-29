const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const CustomRequest = require('../models/CustomRequest');
const Order = require('../models/Order');
const { canTransition, requestTransitions } = require('../domain/statusTransitions');
const { AppError } = require('../utils/errors');
const { pageResult } = require('../utils/http');

function hashTrackingToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function assertTrackingToken(request, token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)
    || !/^[a-f0-9]{64}$/i.test(request.trackingTokenHash || '')) {
    throw new AppError('Request not found or tracking link is invalid.', 404);
  }
  const expected = Buffer.from(request.trackingTokenHash, 'hex');
  const received = Buffer.from(hashTrackingToken(token), 'hex');
  if (!crypto.timingSafeEqual(expected, received)) {
    throw new AppError('Request not found or tracking link is invalid.', 404);
  }
}

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

async function getCustomerRequest(id, token) {
  const request = await CustomRequest.findById(id)
    .select('+trackingTokenHash')
    .populate({ path: 'category', select: 'name' })
    .lean();
  if (!request) throw new AppError('Request not found or tracking link is invalid.', 404);
  assertTrackingToken(request, token);
  return {
    id: String(request._id),
    customer: request.customer,
    productName: request.productName,
    category: request.category?.name || '',
    budget: request.budget,
    requestedColors: request.requestedColors,
    description: request.description,
    quoteMessage: request.quoteMessage,
    quotedPrice: request.quotedPrice,
    rejectionReason: request.rejectionReason,
    status: request.status,
    orderId: request.orderId ? String(request.orderId) : '',
    createdAt: request.createdAt,
  };
}

async function createCustomRequest(input) {
  const category = await Category.findOne({ _id: input.category, status: 'visible' }).select('_id').lean();
  if (!category) throw new AppError('The selected category does not exist or is hidden.');
  const trackingToken = crypto.randomBytes(32).toString('hex');
  const [request] = await CustomRequest.create([{
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
    trackingTokenHash: hashTrackingToken(trackingToken),
  }]);
  return { requestId: String(request._id), trackingToken };
}

async function createOrderFromQuote(id, token, input) {
  const rawAddress = input.customer?.address;
  if (typeof rawAddress !== 'string') throw new AppError('A delivery address is required.');
  const address = rawAddress.trim();
  if (!address || address.length > 500) throw new AppError('A delivery address is required.');

  const session = await mongoose.startSession();
  let createdOrder;
  try {
    await session.withTransaction(async () => {
      const request = await CustomRequest.findById(id).select('+trackingTokenHash').session(session);
      if (!request) throw new AppError('Request not found or tracking link is invalid.', 404);
      assertTrackingToken(request, token);
      if (request.status !== 'quoted' || request.quotedPrice === null) {
        throw new AppError('This request does not have an active quote to order.', 409);
      }
      if (!Number.isSafeInteger(request.quotedPrice + 30000)) throw new AppError('The order total is too large.');

      [createdOrder] = await Order.create([{
        customer: {
          name: request.customer.name,
          phone: request.customer.phone,
          email: request.customer.email || '',
          address,
        },
        totalAmount: request.quotedPrice + 30000,
        paymentMethod: 'COD',
        items: [{
          customRequestId: request._id,
          productName: request.productName,
          priceAtPurchase: request.quotedPrice,
          color: request.requestedColors[0],
          requestedColors: request.requestedColors,
          customDescription: request.description,
          quantity: 1,
        }],
      }], { session });

      request.status = 'accepted';
      request.orderId = createdOrder._id;
      await request.save({ session });
    });
    return createdOrder;
  } finally {
    await session.endSession();
  }
}

async function updateCustomRequest(id, input) {
  const request = await CustomRequest.findById(id);
  if (!request) throw new AppError('Custom request not found.', 404);

  if (input.quoteMessage !== undefined) request.quoteMessage = input.quoteMessage;
  if (input.quotedPrice !== undefined) request.quotedPrice = input.quotedPrice;
  if (input.rejectionReason !== undefined) request.rejectionReason = input.rejectionReason;

  if (input.status !== undefined) {
    if (input.status === 'accepted') {
      throw new AppError('The customer must accept a quote by placing the order.');
    }
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

module.exports = {
  createCustomRequest,
  createOrderFromQuote,
  getCustomerRequest,
  getCustomRequest,
  listCustomRequests,
  updateCustomRequest,
};
