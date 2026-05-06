const mongoose = require('mongoose');

const mouldSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Mould code is required'],
    unique: true,
    trim: true,
    uppercase: true
    // e.g. TR1, TR2, PO1
  },
  name: { type: String, trim: true },
  sku: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SKU',
    required: true
  },
  componentName: {
    type: String,
    trim: true
    // Which part of the SKU this mould produces
  },
  partsPerShot: {
    type: Number,
    required: true,
    min: 1
  },
  machineName: { type: String, trim: true },
  notes: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Mould', mouldSchema);
