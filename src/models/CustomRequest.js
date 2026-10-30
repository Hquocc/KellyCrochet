const mongoose = require('mongoose');

const customRequestSchema = new mongoose.Schema({
  customer: {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30, match: /^[+()\d.\-\s]{8,30}$/ },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: '',
      validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    },
  },
  productName: { type: String, required: true, trim: true, maxlength: 160 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  budget: { type: String, required: true, trim: true, maxlength: 120 },
  requestedColors: {
    type: [{ type: String, trim: true, maxlength: 40 }],
    required: true,
    validate: {
      validator: (colors) => colors.length > 0 && colors.length <= 20,
      message: 'Specify between 1 and 20 requested colors.',
    },
  },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  quoteMessage: { type: String, trim: true, maxlength: 3000, default: '' },
  quotedPrice: { type: Number, min: 0, default: null, validate: (value) => value === null || Number.isSafeInteger(value) },
  trackingTokenHash: { type: String, select: false, match: /^[a-f0-9]{64}$/ },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  status: {
    type: String,
    enum: ['waiting_quote', 'quoted', 'accepted', 'rejected'],
    default: 'waiting_quote',
    index: true,
  },
  rejectionReason: { type: String, trim: true, maxlength: 1000, default: '' },
}, { timestamps: true, versionKey: false });

customRequestSchema.index({ createdAt: -1 });
customRequestSchema.index({ 'customer.phone': 1, createdAt: -1 });
customRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.CustomRequest || mongoose.model('CustomRequest', customRequestSchema);
