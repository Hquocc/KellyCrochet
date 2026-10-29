const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  price: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  images: {
    type: [{ type: String, trim: true, maxlength: 350000 }],
    required: true,
    validate: {
      validator: (images) => images.length > 0 && images.length <= 10
        && images.every((image) => image.startsWith('data:image/webp;base64,')
          ? /^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(image)
          : image.length <= 2048),
      message: 'A product must have 1 to 10 valid images.',
    },
  },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  colors: {
    type: [{ type: String, trim: true, maxlength: 40 }],
    required: true,
    validate: {
      validator: (colors) => colors.length > 0 && new Set(colors).size === colors.length,
      message: 'A product must have unique colors.',
    },
  },
  quantity: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  status: {
    type: String,
    enum: ['selling', 'out_of_stock'],
    default: 'out_of_stock',
  },
}, { timestamps: true, versionKey: false });

productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ category: 1, status: 1, createdAt: -1 });
productSchema.pre('validate', function setStockStatus() {
  this.status = this.quantity > 0 ? 'selling' : 'out_of_stock';
});

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
