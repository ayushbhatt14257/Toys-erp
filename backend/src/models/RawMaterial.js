const mongoose = require('mongoose');

const UNITS = ['pcs', 'nos', 'gms', 'kg', 'ml', 'ltr', 'mtr', 'set', 'box', 'sheets'];

const rawMaterialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Raw material name is required'],
    unique: true,
    trim: true
  },
  code: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true
  },
  unit: {
    type: String,
    enum: UNITS,
    required: [true, 'Unit is required']
  },
  qtyOnHand: {
    type: Number,
    default: 0,
    min: 0
  },
  reorderLevel: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

rawMaterialSchema.statics.UNITS = UNITS;

module.exports = mongoose.model('RawMaterial', rawMaterialSchema);
