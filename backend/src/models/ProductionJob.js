const mongoose = require('mongoose');

const JOB_STATUSES = ['planned', 'raw_material_check', 'material_allocated', 'in_progress', 'completed', 'cancelled'];

const jobItemSchema = new mongoose.Schema({
  sku: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SKU',
    required: true
  },
  bom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BOM',
    required: true
  },
  qtyToMake: {
    type: Number,
    required: true,
    min: 1
  },
  qtyCompleted: {
    type: Number,
    default: 0
  },
  mould: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mould'
  },
  shotsRequired: { type: Number },
  shotsCompleted: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  },
  // Raw material requirements calculated from BOM
  materialRequirements: [{
    rawMaterial: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial' },
    required: { type: Number },
    allocated: { type: Number, default: 0 },
    unit: { type: String },
    isAvailable: { type: Boolean, default: false }
  }],
  // Link back to order item if triggered from an order
  orderRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  orderItemRef: { type: mongoose.Schema.Types.ObjectId }
}, { _id: true });

const productionJobSchema = new mongoose.Schema({
  jobNumber: {
    type: String,
    unique: true
    // Auto-generated: PRD-2024-0001
  },
  name: {
    type: String,
    trim: true
    // Descriptive name for the job
  },
  items: {
    type: [jobItemSchema],
    validate: {
      validator: v => v.length > 0,
      message: 'Production job must have at least one item'
    }
  },
  status: {
    type: String,
    enum: JOB_STATUSES,
    default: 'planned'
  },
  plannedStartDate: { type: Date },
  actualStartDate: { type: Date },
  plannedEndDate: { type: Date },
  actualEndDate: { type: Date },
  notes: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Auto-generate job number
productionJobSchema.pre('save', async function (next) {
  if (this.isNew) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments();
    this.jobNumber = `PRD-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

productionJobSchema.statics.JOB_STATUSES = JOB_STATUSES;

module.exports = mongoose.model('ProductionJob', productionJobSchema);
