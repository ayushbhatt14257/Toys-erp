const BOM = require('../models/BOM');
const { createAuditLog } = require('../middleware/audit');

// GET /api/bom?skuId=xxx
const getBOMs = async (req, res) => {
  const { skuId } = req.query;
  const filter = {};
  if (skuId) filter.sku = skuId;
  const boms = await BOM.find(filter)
    .populate('sku', 'name itemCode category')
    .populate('components.rawMaterial', 'name unit qtyOnHand')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: boms.length, data: boms });
};

// GET /api/bom/:id
const getBOM = async (req, res) => {
  const bom = await BOM.findById(req.params.id)
    .populate('sku', 'name itemCode category')
    .populate('components.rawMaterial', 'name unit qtyOnHand');
  if (!bom) return res.status(404).json({ success: false, message: 'BOM not found.' });
  res.json({ success: true, data: bom });
};

// POST /api/bom
const createBOM = async (req, res) => {
  const { sku, variantName, isDefault, components, notes } = req.body;

  // If setting as default, unset any existing default for this SKU
  if (isDefault) {
    await BOM.updateMany({ sku, isDefault: true }, { isDefault: false });
  }

  const bom = await BOM.create({ sku, variantName, isDefault, components, notes, createdBy: req.user._id });
  await createAuditLog({
    user: req.user, action: 'CREATE', entityType: 'BOM',
    entityId: bom._id, after: req.body, req
  });

  const populated = await BOM.findById(bom._id)
    .populate('sku', 'name itemCode')
    .populate('components.rawMaterial', 'name unit');

  res.status(201).json({ success: true, data: populated });
};

// PUT /api/bom/:id
const updateBOM = async (req, res) => {
  const before = await BOM.findById(req.params.id).lean();
  const { isDefault, ...rest } = req.body;

  if (isDefault) {
    await BOM.updateMany({ sku: before.sku, isDefault: true }, { isDefault: false });
  }

  const bom = await BOM.findByIdAndUpdate(
    req.params.id,
    { ...rest, isDefault, updatedBy: req.user._id },
    { new: true, runValidators: true }
  ).populate('sku', 'name itemCode').populate('components.rawMaterial', 'name unit');

  if (!bom) return res.status(404).json({ success: false, message: 'BOM not found.' });

  await createAuditLog({
    user: req.user, action: 'UPDATE', entityType: 'BOM',
    entityId: bom._id, before, after: req.body, req
  });

  res.json({ success: true, data: bom });
};

// DELETE /api/bom/:id
const deleteBOM = async (req, res) => {
  const bom = await BOM.findByIdAndUpdate(
    req.params.id, { isActive: false, updatedBy: req.user._id }, { new: true }
  );
  if (!bom) return res.status(404).json({ success: false, message: 'BOM not found.' });
  await createAuditLog({
    user: req.user, action: 'DELETE', entityType: 'BOM', entityId: bom._id, req
  });
  res.json({ success: true, message: 'BOM deactivated.' });
};

// GET /api/bom/calculate?bomId=xxx&quantity=100
const calculateRequirements = async (req, res) => {
  const { bomId, quantity } = req.query;
  const qty = Number(quantity);
  const bom = await BOM.findById(bomId)
    .populate('components.rawMaterial', 'name unit qtyOnHand');
  if (!bom) return res.status(404).json({ success: false, message: 'BOM not found.' });

  const requirements = bom.components.map(comp => {
    const required = comp.quantity * qty;
    const available = comp.rawMaterial.qtyOnHand;
    return {
      rawMaterial: comp.rawMaterial.name,
      rawMaterialId: comp.rawMaterial._id,
      unit: comp.unit,
      perUnit: comp.quantity,
      required,
      available,
      isAvailable: available >= required,
      shortage: Math.max(0, required - available)
    };
  });

  const allAvailable = requirements.every(r => r.isAvailable);
  res.json({ success: true, data: { requirements, allAvailable, quantity: qty } });
};

module.exports = { getBOMs, getBOM, createBOM, updateBOM, deleteBOM, calculateRequirements };
