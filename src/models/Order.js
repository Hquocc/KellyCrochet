const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId },
  customRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomRequest' },
  productName: { type: String, required: true, trim: true, maxlength: 160 },
  priceAtPurchase: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  color: { type: String, required: true, trim: true, maxlength: 40 },
  quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
  requestedColors: { type: [{ type: String, trim: true, maxlength: 40 }], default: [] },
  customDescription: { type: String, trim: true, maxlength: 5000, default: '' },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  customer: {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30, match: /^[+()\d.\-\s]{8,30}$/ },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: '',
      validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    },
  },
  status: {
    type: String,
    enum: ['pending_confirmation', 'preparing', 'shipping', 'completed', 'cancelled'],
    default: 'pending_confirmation',
    index: true,
  },
  note: { type: String, trim: true, maxlength: 2000, default: '' },
  totalAmount: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  paymentMethod: { type: String, enum: ['COD'], default: 'COD', required: true },
  items: {
    type: [orderItemSchema],
    required: true,
    validate: {
      validator: (items) => items.length > 0 && items.length <= 100
        && items.every((item) => Boolean(item.productId) !== Boolean(item.customRequestId)),
      message: 'An order must contain between 1 and 100 products.',
    },
  },
}, { timestamps: true, versionKey: false });

orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'customer.phone': 1, createdAt: -1 });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
