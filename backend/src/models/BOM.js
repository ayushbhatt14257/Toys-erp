const mongoose = require('mongoose');

const bomComponentSchema = new mongoose.Schema({
  rawMaterial: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RawMaterial',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true
  },
  rate: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

const bomSchema = new mongoose.Schema({
  sku: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SKU',
    required: true
  },
  variantName: {
    type: String,
    required: [true, 'Variant name is required'],
    trim: true
    // e.g. "Standard", "Export", "Premium"
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  components: {
    type: [bomComponentSchema],
    validate: {
      validator: v => v.length > 0,
      message: 'BOM must have at least one component'
    }
  },
  notes: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// One default BOM per SKU
bomSchema.index({ sku: 1, variantName: 1 }, { unique: true });

module.exports = mongoose.model('BOM', bomSchema);
