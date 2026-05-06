const mongoose = require('mongoose');

const ORDER_STATUSES = ['draft', 'confirmed', 'in_inventory', 'in_production', 'completed', 'cancelled'];

const orderItemSchema = new mongoose.Schema({
  sku: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SKU',
    required: true
  },
  itemCode: { type: String },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  reservedQty: { type: Number, default: 0 },
  fulfilledQty: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'reserved', 'in_production', 'fulfilled', 'shortfall'],
    default: 'pending'
  }
}, { _id: true });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
    // Auto-generated: ORD-2024-0001
  },
  party: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Party',
    required: [true, 'Party is required']
  },
  dateOfReceipt: {
    type: Date,
    required: [true, 'Date of receipt is required']
  },
  deliveryDate: { type: Date },
  transporterName: { type: String, trim: true },
  transporterDetails: { type: String, trim: true },
  items: {
    type: [orderItemSchema],
    validate: {
      validator: v => v.length > 0,
      message: 'Order must have at least one item'
    }
  },
  status: {
    type: String,
    enum: ORDER_STATUSES,
    default: 'draft'
  },
  paymentReceived: {
    type: Boolean,
    default: false
  },
  paymentDate: { type: Date },
  isLocked: {
    type: Boolean,
    default: false
  },
  notes: { type: String, trim: true },
  totalAmount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lockedAt: { type: Date }
}, { timestamps: true });

// Auto-generate order number
orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments();
    this.orderNumber = `ORD-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  // Recalculate total
  this.totalAmount = this.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  next();
});

// Lock order when payment received
orderSchema.pre('save', function (next) {
  if (this.isModified('paymentReceived') && this.paymentReceived) {
    this.isLocked = true;
    this.paymentDate = new Date();
  }
  next();
});

orderSchema.statics.ORDER_STATUSES = ORDER_STATUSES;

module.exports = mongoose.model('Order', orderSchema);
