const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['visible', 'hidden'], default: 'visible', index: true },
}, { timestamps: true, versionKey: false });

categorySchema.index({ name: 1 }, { unique: true, collation: { locale: 'vi', strength: 2 } });

module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema);
