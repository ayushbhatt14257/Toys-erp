const mongoose = require('mongoose');

const CATEGORIES = ['toy_truck', 'rattle', 'wooden_toy', 'vehicle', 'educational', 'other'];
const UNITS = ['pcs', 'nos', 'gms', 'kg', 'ml', 'ltr', 'mtr', 'set', 'box'];

const skuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'SKU name is required'],
    trim: true
  },
  itemCode: {
    type: String,
    required: [true, 'Item code is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  category: {
    type: String,
    enum: CATEGORIES,
    required: [true, 'Category is required']
  },
  unit: {
    type: String,
    enum: UNITS,
    default: 'pcs'
  },
  description: { type: String, trim: true },
  basePrice: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Compound index: name + category must be unique
skuSchema.index({ name: 1, category: 1 }, { unique: true });

skuSchema.statics.CATEGORIES = CATEGORIES;
skuSchema.statics.UNITS = UNITS;

module.exports = mongoose.model('SKU', skuSchema);
