const ProductionJob = require('../models/ProductionJob');
const BOM = require('../models/BOM');
const RawMaterial = require('../models/RawMaterial');
const InventoryStock = require('../models/InventoryStock');
const Order = require('../models/Order');
const Mould = require('../models/Mould');
const { createAuditLog } = require('../middleware/audit');

// GET /api/production
const getJobs = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const skip = (page - 1) * limit;
  const [jobs, total] = await Promise.all([
    ProductionJob.find(filter)
      .populate('items.sku', 'name itemCode category')
      .populate('items.bom', 'variantName')
      .populate('items.mould', 'code partsPerShot')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip).limit(Number(limit)),
    ProductionJob.countDocuments(filter)
  ]);
  res.json({ success: true, data: jobs, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
};

// GET /api/production/dashboard
const getDashboard = async (req, res) => {
  const statusCounts = await ProductionJob.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  res.json({ success: true, data: { statusCounts } });
};

// GET /api/production/:id
const getJob = async (req, res) => {
  const job = await ProductionJob.findById(req.params.id)
    .populate('items.sku', 'name itemCode category unit')
    .populate('items.bom', 'variantName components')
    .populate('items.mould', 'code partsPerShot componentName machineName')
    .populate('items.materialRequirements.rawMaterial', 'name unit qtyOnHand')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name');
  if (!job) return res.status(404).json({ success: false, message: 'Production job not found.' });
  res.json({ success: true, data: job });
};

// POST /api/production — create job (manually triggered)
const createJob = async (req, res) => {
  const { name, items, plannedStartDate, plannedEndDate, notes } = req.body;
  // items: [{ skuId, bomId, qtyToMake, mouldId, orderRef, orderItemRef }]

  const enrichedItems = await Promise.all(items.map(async (item) => {
    const bom = await BOM.findById(item.bomId).populate('components.rawMaterial');
    if (!bom) throw { statusCode: 400, message: `BOM not found: ${item.bomId}` };

    // Calculate material requirements
    const materialRequirements = bom.components.map(comp => ({
      rawMaterial: comp.rawMaterial._id,
      required: comp.quantity * item.qtyToMake,
      allocated: 0,
      unit: comp.unit,
      isAvailable: comp.rawMaterial.qtyOnHand >= (comp.quantity * item.qtyToMake)
    }));

    // Calculate shots if mould provided
    let shotsRequired;
    if (item.mouldId) {
      const mould = await Mould.findById(item.mouldId);
      if (mould) shotsRequired = Math.ceil(item.qtyToMake / mould.partsPerShot);
    }

    return {
      sku: item.skuId,
      bom: item.bomId,
      qtyToMake: item.qtyToMake,
      mould: item.mouldId || undefined,
      shotsRequired,
      materialRequirements,
      orderRef: item.orderRef || undefined,
      orderItemRef: item.orderItemRef || undefined
    };
  }));

  const job = await ProductionJob.create({
    name, items: enrichedItems, plannedStartDate, plannedEndDate, notes,
    createdBy: req.user._id, status: 'planned'
  });

  await createAuditLog({
    user: req.user, action: 'PRODUCTION_TRIGGER', entityType: 'ProductionJob',
    entityId: job._id, entityRef: job.jobNumber, after: req.body, req
  });

  res.status(201).json({ success: true, data: job });
};

// PATCH /api/production/:id/start — allocate materials and start
const startJob = async (req, res) => {
  const job = await ProductionJob.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
  if (job.status !== 'planned' && job.status !== 'material_allocated') {
    return res.status(400).json({ success: false, message: `Cannot start a job with status: ${job.status}` });
  }

  // Check all materials available and deduct
  for (const item of job.items) {
    for (const req_mat of item.materialRequirements) {
      const material = await RawMaterial.findById(req_mat.rawMaterial);
      if (!material || material.qtyOnHand < req_mat.required) {
        return res.status(400).json({
          success: false,
          message: `Insufficient raw material: ${material?.name || req_mat.rawMaterial}. Required: ${req_mat.required}, Available: ${material?.qtyOnHand || 0}`
        });
      }
    }
  }

  // All checks passed — deduct materials
  for (const item of job.items) {
    for (const req_mat of item.materialRequirements) {
      await RawMaterial.findByIdAndUpdate(req_mat.rawMaterial, {
        $inc: { qtyOnHand: -req_mat.required },
        updatedBy: req.user._id
      });
      req_mat.allocated = req_mat.required;
      req_mat.isAvailable = true;
    }
    item.status = 'in_progress';
  }

  job.status = 'in_progress';
  job.actualStartDate = new Date();
  job.updatedBy = req.user._id;
  await job.save();

  await createAuditLog({
    user: req.user, action: 'PRODUCTION_START', entityType: 'ProductionJob',
    entityId: job._id, entityRef: job.jobNumber, req
  });

  res.json({ success: true, message: 'Production job started. Materials deducted.', data: job });
};

// PATCH /api/production/:id/complete — mark job complete, add to inventory
const completeJob = async (req, res) => {
  const { completedQuantities } = req.body;
  // completedQuantities: [{ itemId, qtyCompleted }]

  const job = await ProductionJob.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
  if (job.status !== 'in_progress') {
    return res.status(400).json({ success: false, message: 'Job must be in-progress to complete.' });
  }

  // Add completed quantities to finished goods inventory
  for (const item of job.items) {
    const completedEntry = completedQuantities?.find(c => c.itemId === item._id.toString());
    const qtyCompleted = completedEntry?.qtyCompleted || item.qtyToMake;
    item.qtyCompleted = qtyCompleted;
    item.status = 'completed';

    // Add to inventory
    let stock = await InventoryStock.findOne({ sku: item.sku });
    if (!stock) stock = await InventoryStock.create({ sku: item.sku, qtyOnHand: 0, qtyReserved: 0 });
    stock.qtyOnHand += qtyCompleted;
    stock.transactions.push({
      type: 'production_in', quantity: qtyCompleted,
      reference: job.jobNumber, referenceId: job._id,
      performedBy: req.user._id
    });
    await stock.save();

    // Update linked order item status if applicable
    if (item.orderRef) {
      await Order.findByIdAndUpdate(item.orderRef,
        { $set: { 'items.$[el].status': 'fulfilled', 'items.$[el].fulfilledQty': qtyCompleted } },
        { arrayFilters: [{ 'el._id': item.orderItemRef }] }
      );
    }
  }

  job.status = 'completed';
  job.actualEndDate = new Date();
  job.updatedBy = req.user._id;
  await job.save();

  await createAuditLog({
    user: req.user, action: 'PRODUCTION_COMPLETE', entityType: 'ProductionJob',
    entityId: job._id, entityRef: job.jobNumber, req
  });

  res.json({ success: true, message: 'Job completed. Finished goods added to inventory.', data: job });
};

// PATCH /api/production/:id/cancel
const cancelJob = async (req, res) => {
  const job = await ProductionJob.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
  if (job.status === 'completed') {
    return res.status(400).json({ success: false, message: 'Cannot cancel a completed job.' });
  }
  job.status = 'cancelled';
  job.updatedBy = req.user._id;
  await job.save();
  res.json({ success: true, data: job });
};

module.exports = { getJobs, getDashboard, getJob, createJob, startJob, completeJob, cancelJob };
