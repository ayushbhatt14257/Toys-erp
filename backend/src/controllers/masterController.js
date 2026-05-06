const Party = require('../models/Party');
const SKU = require('../models/SKU');
const RawMaterial = require('../models/RawMaterial');
const { createAuditLog } = require('../middleware/audit');

// ─── PARTIES ────────────────────────────────────────────────────────────────

const getParties = async (req, res) => {
  const { active } = req.query;
  const filter = active === 'true' ? { isActive: true } : {};
  const parties = await Party.find(filter).sort({ name: 1 });
  res.json({ success: true, count: parties.length, data: parties });
};

const createParty = async (req, res) => {
  const party = await Party.create({ ...req.body, createdBy: req.user._id });
  await createAuditLog({
    user: req.user, action: 'CREATE', entityType: 'Party',
    entityId: party._id, after: req.body, req
  });
  res.status(201).json({ success: true, data: party });
};

const updateParty = async (req, res) => {
  const before = await Party.findById(req.params.id).lean();
  const party = await Party.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!party) return res.status(404).json({ success: false, message: 'Party not found.' });
  await createAuditLog({
    user: req.user, action: 'UPDATE', entityType: 'Party',
    entityId: party._id, before, after: req.body, req
  });
  res.json({ success: true, data: party });
};

const deleteParty = async (req, res) => {
  const party = await Party.findByIdAndUpdate(
    req.params.id, { isActive: false, updatedBy: req.user._id }, { new: true }
  );
  if (!party) return res.status(404).json({ success: false, message: 'Party not found.' });
  await createAuditLog({
    user: req.user, action: 'DELETE', entityType: 'Party', entityId: party._id, req
  });
  res.json({ success: true, message: 'Party deactivated.' });
};

// ─── SKUs ────────────────────────────────────────────────────────────────────

const getSKUs = async (req, res) => {
  const { active, category } = req.query;
  const filter = {};
  if (active === 'true') filter.isActive = true;
  if (category) filter.category = category;
  const skus = await SKU.find(filter).sort({ name: 1 });
  res.json({ success: true, count: skus.length, data: skus, categories: SKU.CATEGORIES, units: SKU.UNITS });
};

const getSKU = async (req, res) => {
  const sku = await SKU.findById(req.params.id);
  if (!sku) return res.status(404).json({ success: false, message: 'SKU not found.' });
  res.json({ success: true, data: sku });
};

const createSKU = async (req, res) => {
  const sku = await SKU.create({ ...req.body, createdBy: req.user._id });
  await createAuditLog({
    user: req.user, action: 'CREATE', entityType: 'SKU',
    entityId: sku._id, after: req.body, req
  });
  res.status(201).json({ success: true, data: sku });
};

const updateSKU = async (req, res) => {
  const before = await SKU.findById(req.params.id).lean();
  const sku = await SKU.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!sku) return res.status(404).json({ success: false, message: 'SKU not found.' });
  await createAuditLog({
    user: req.user, action: 'UPDATE', entityType: 'SKU',
    entityId: sku._id, before, after: req.body, req
  });
  res.json({ success: true, data: sku });
};

const deleteSKU = async (req, res) => {
  const sku = await SKU.findByIdAndUpdate(
    req.params.id, { isActive: false, updatedBy: req.user._id }, { new: true }
  );
  if (!sku) return res.status(404).json({ success: false, message: 'SKU not found.' });
  await createAuditLog({
    user: req.user, action: 'DELETE', entityType: 'SKU', entityId: sku._id, req
  });
  res.json({ success: true, message: 'SKU deactivated.' });
};

// ─── RAW MATERIALS ───────────────────────────────────────────────────────────

const getRawMaterials = async (req, res) => {
  const { active } = req.query;
  const filter = active === 'true' ? { isActive: true } : {};
  const materials = await RawMaterial.find(filter).sort({ name: 1 });
  res.json({ success: true, count: materials.length, data: materials, units: RawMaterial.schema.path('unit').enumValues });
};

const getRawMaterial = async (req, res) => {
  const material = await RawMaterial.findById(req.params.id);
  if (!material) return res.status(404).json({ success: false, message: 'Raw material not found.' });
  res.json({ success: true, data: material });
};

const createRawMaterial = async (req, res) => {
  const material = await RawMaterial.create({ ...req.body, createdBy: req.user._id });
  await createAuditLog({
    user: req.user, action: 'CREATE', entityType: 'RawMaterial',
    entityId: material._id, after: req.body, req
  });
  res.status(201).json({ success: true, data: material });
};

const updateRawMaterial = async (req, res) => {
  const before = await RawMaterial.findById(req.params.id).lean();
  const material = await RawMaterial.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!material) return res.status(404).json({ success: false, message: 'Raw material not found.' });
  await createAuditLog({
    user: req.user, action: 'UPDATE', entityType: 'RawMaterial',
    entityId: material._id, before, after: req.body, req
  });
  res.json({ success: true, data: material });
};

const deleteRawMaterial = async (req, res) => {
  const material = await RawMaterial.findByIdAndUpdate(
    req.params.id, { isActive: false, updatedBy: req.user._id }, { new: true }
  );
  if (!material) return res.status(404).json({ success: false, message: 'Raw material not found.' });
  await createAuditLog({
    user: req.user, action: 'DELETE', entityType: 'RawMaterial', entityId: material._id, req
  });
  res.json({ success: true, message: 'Raw material deactivated.' });
};

module.exports = {
  getParties, createParty, updateParty, deleteParty,
  getSKUs, getSKU, createSKU, updateSKU, deleteSKU,
  getRawMaterials, getRawMaterial, createRawMaterial, updateRawMaterial, deleteRawMaterial
};
