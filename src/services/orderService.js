const mongoose = require('mongoose');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { canTransition, orderTransitions } = require('../domain/statusTransitions');
const { AppError } = require('../utils/errors');
const { pageResult } = require('../utils/http');

const SHIPPING_FEE = 30000;

async function listOrders(query, pagination) {
  const filter = {};
  if (query.status) {
    if (!Object.hasOwn(orderTransitions, query.status)) throw new AppError('Order status is invalid.');
    filter.status = query.status;
  }
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    Order.countDocuments(filter),
  ]);
  return pageResult(items, total, pagination.page, pagination.limit);
}

async function getOrder(id) {
  const order = await Order.findById(id).lean();
  if (!order) throw new AppError('Order not found.', 404);
  return order;
}

async function createOrder(input) {
  if (input.paymentMethod && input.paymentMethod !== 'COD') {
    throw new AppError('Only cash on delivery (COD) is supported.');
  }
  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 100) {
    throw new AppError('An order must contain between 1 and 100 products.');
  }

  const quantities = new Map();
  for (const item of input.items) {
    if (!item || Array.isArray(item) || typeof item !== 'object') {
      throw new AppError('Each order item must be a JSON object.');
    }
    if (!mongoose.isObjectIdOrHexString(item.productId)) throw new AppError('A product ID is invalid.');
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw new AppError('Product quantities must be positive integers.');
    }
    if (typeof item.color !== 'string' || !item.color.trim()) {
      throw new AppError('Each product must have a selected color.');
    }
    const key = JSON.stringify([String(item.productId), item.color.trim()]);
    const quantity = (quantities.get(key) || 0) + item.quantity;
    if (!Number.isSafeInteger(quantity)) throw new AppError('The requested quantity is too large.');
    quantities.set(key, quantity);
  }

  const session = await mongoose.startSession();
  let createdOrder;
  try {
    await session.withTransaction(async () => {
      const items = [];
      let totalAmount = 0;

      for (const [key, quantity] of quantities) {
        const [productId, color] = JSON.parse(key);
        const product = await Product.findOneAndUpdate(
          { _id: productId, status: 'selling', quantity: { $gte: quantity }, colors: color },
          { $inc: { quantity: -quantity } },
          { new: true, session },
        );
        if (!product) throw new AppError('A product is unavailable or has insufficient stock.', 409);
        const categoryIsVisible = await Category.exists({ _id: product.category, status: 'visible' }).session(session);
        if (!categoryIsVisible) throw new AppError('A product is unavailable or has insufficient stock.', 409);

        if (product.quantity === 0) {
          product.status = 'out_of_stock';
          await product.save({ session });
        }

        const lineTotal = product.price * quantity;
        if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(totalAmount + lineTotal)) {
          throw new AppError('The order total is too large.');
        }
        totalAmount += lineTotal;
        items.push({
          productId: product._id,
          productName: product.name,
          priceAtPurchase: product.price,
          color,
          quantity,
        });
      }

      if (!Number.isSafeInteger(totalAmount + SHIPPING_FEE)) {
        throw new AppError('The order total is too large.');
      }

      const customer = input.customer || {};
      [createdOrder] = await Order.create([{
        customer: {
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          email: customer.email || '',
        },
        note: input.note || '',
        totalAmount: totalAmount + SHIPPING_FEE,
        paymentMethod: 'COD',
        items,
      }], { session });
    });
    return createdOrder;
  } finally {
    await session.endSession();
  }
}

async function updateOrderStatus(id, nextStatus) {
  const session = await mongoose.startSession();
  let updatedOrder;
  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(id).session(session);
      if (!order) throw new AppError('Order not found.', 404);
      if (!canTransition(orderTransitions, order.status, nextStatus)) {
        throw new AppError(`Order cannot move from ${order.status} to ${nextStatus}.`, 409);
      }

      if (nextStatus === 'cancelled') {
        for (const item of order.items) {
          const product = await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { quantity: item.quantity } },
            { new: true, session },
          );
          if (!product) throw new AppError('An ordered product is missing; cancellation was not applied.', 409);
          product.status = product.quantity > 0 ? 'selling' : 'out_of_stock';
          await product.save({ session });
        }
      }

      order.status = nextStatus;
      updatedOrder = await order.save({ session });
    });
    return updatedOrder;
  } finally {
    await session.endSession();
  }
}

module.exports = { createOrder, getOrder, listOrders, updateOrderStatus };
