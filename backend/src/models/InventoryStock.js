const mongoose = require('mongoose');

const stockTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['stock_in', 'reserved', 'released', 'fulfilled', 'adjustment', 'production_in'],
    required: true
  },
  quantity: { type: Number, required: true },
  reference: { type: String }, // order number or production job number
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  notes: { type: String },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedAt: { type: Date, default: Date.now }
}, { _id: true });

const inventoryStockSchema = new mongoose.Schema({
  sku: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SKU',
    required: true,
    unique: true
  },
  qtyOnHand: {
    type: Number,
    default: 0,
    min: 0
  },
  qtyReserved: {
    type: Number,
    default: 0,
    min: 0
  },
  transactions: [stockTransactionSchema],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Virtual: available quantity
inventoryStockSchema.virtual('qtyAvailable').get(function () {
  return this.qtyOnHand - this.qtyReserved;
});

inventoryStockSchema.set('toJSON', { virtuals: true });
inventoryStockSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('InventoryStock', inventoryStockSchema);
