const mongoose = require('mongoose');

const ACTIONS = [
  'CREATE', 'UPDATE', 'DELETE',
  'PAYMENT_LOCK',
  'STOCK_IN', 'STOCK_RESERVE', 'STOCK_RELEASE', 'STOCK_ADJUST',
  'PRODUCTION_TRIGGER', 'PRODUCTION_START', 'PRODUCTION_COMPLETE',
  'MATERIAL_ALLOCATE', 'MATERIAL_DEDUCT',
  'LOGIN', 'LOGOUT',
  'IMPORT'
];

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: { type: String },
  userRole: { type: String },
  action: {
    type: String,
    enum: ACTIONS,
    required: true
  },
  entityType: {
    type: String,
    required: true
    // 'Order', 'SKU', 'Party', 'RawMaterial', 'BOM', 'InventoryStock', 'ProductionJob'
  },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  entityRef: { type: String }, // human readable ref like order number
  before: { type: mongoose.Schema.Types.Mixed },
  after: { type: mongoose.Schema.Types.Mixed },
  meta: { type: mongoose.Schema.Types.Mixed }, // extra info
  ip: { type: String },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: false,
  // Prevent any updates to audit logs
  statics: {
    findOneAndUpdate: undefined,
    findByIdAndUpdate: undefined,
    updateOne: undefined,
    updateMany: undefined
  }
});

// TTL index — keep audit logs for 2 years
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ user: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
