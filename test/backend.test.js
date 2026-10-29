const test = require('node:test');
const assert = require('node:assert/strict');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const CustomRequest = require('../src/models/CustomRequest');
const User = require('../src/models/User');
const { canTransition, orderTransitions, requestTransitions } = require('../src/domain/statusTransitions');
const { pagination, readBody } = require('../src/utils/http');
const { createOrder } = require('../src/services/orderService');
const { createApiHandler } = require('../src/app');

test('product schema stores multiple images and derives stock status from quantity', async () => {
  const product = new Product({
    name: 'Túi len',
    price: 250000,
    images: ['one.jpg', 'two.jpg'],
    category: '507f1f77bcf86cd799439011',
    description: 'Mô tả',
    colors: ['Trắng', 'Đỏ'],
    quantity: 0,
  });

  await product.validate();
  assert.equal(product.status, 'out_of_stock');
  assert.equal(product.schema.path('images').instance, 'Array');
  assert.equal(product.schema.path('category').options.ref, 'Category');
  assert.equal(product.schema.path('isNew'), undefined);
  assert.equal(product.schema.options.timestamps, true);
});

test('order schema embeds purchase snapshots and only permits COD', () => {
  const itemSchema = Order.schema.path('items').schema;
  assert.equal(itemSchema.path('productId').instance, 'ObjectId');
  assert.equal(itemSchema.path('priceAtPurchase').instance, 'Number');
  assert.equal(itemSchema.path('color').instance, 'String');
  assert.equal(itemSchema.path('quantity').instance, 'Number');
  assert.deepEqual(Order.schema.path('paymentMethod').enumValues, ['COD']);
  assert.equal(Order.schema.options.timestamps, true);
});

test('custom request and user schemas enforce the supported status and roles', () => {
  assert.deepEqual(
    CustomRequest.schema.path('status').enumValues,
    ['waiting_quote', 'quoted', 'accepted', 'rejected'],
  );
  assert.deepEqual(User.schema.path('role').enumValues, ['admin', 'user']);
  const serializedUser = new User({
    username: 'test-user',
    passwordHash: 'not-serialized',
    role: 'user',
  }).toJSON();
  assert.equal(Object.hasOwn(serializedUser, 'passwordHash'), false);
});

test('status transitions only allow forward progress and cancellation before shipping', () => {
  assert.equal(canTransition(orderTransitions, 'pending_confirmation', 'preparing'), true);
  assert.equal(canTransition(orderTransitions, 'shipping', 'cancelled'), false);
  assert.equal(canTransition(requestTransitions, 'quoted', 'accepted'), true);
  assert.equal(canTransition(requestTransitions, 'accepted', 'quoted'), false);
});

test('HTTP helpers parse JSON and reject invalid pagination and body shapes', () => {
  assert.deepEqual(readBody({ body: '{"name":"test"}' }), { name: 'test' });
  assert.throws(() => readBody({ body: 'not json' }), /invalid JSON/);
  assert.throws(() => readBody({ body: '[]' }), /JSON object/);
  assert.deepEqual(pagination({ query: { page: '2', limit: '10' } }), {
    page: 2,
    limit: 10,
    skip: 10,
  });
  assert.throws(() => pagination({ query: { limit: '1000' } }), /between 1 and 100/);
});

test('order creation rejects malformed item objects before accessing the database', async () => {
  await assert.rejects(createOrder({ items: [null] }), /JSON object/);
  await assert.rejects(
    createOrder({ items: [{ productId: 'not-an-id', quantity: 1, color: 'Trắng' }] }),
    /product ID is invalid/,
  );
});

test('API handler rejects unsupported methods without opening a database connection', async () => {
  const headers = {};
  const result = {};
  const response = {
    setHeader(name, value) { headers[name] = value; },
    status(code) { result.status = code; return this; },
    json(body) { result.body = body; return this; },
  };
  await createApiHandler({ GET: async () => ({}) })({ method: 'DELETE' }, response);
  assert.equal(result.status, 405);
  assert.equal(headers.Allow, 'GET');
  assert.equal(headers['Cache-Control'], 'no-store');
});
