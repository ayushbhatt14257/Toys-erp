const express = require('express');
const { authenticate, masterAdminOnly, authorize } = require('../middleware/auth');
const {
  getParties, createParty, updateParty, deleteParty,
  getSKUs, getSKU, createSKU, updateSKU, deleteSKU,
  getRawMaterials, getRawMaterial, createRawMaterial, updateRawMaterial, deleteRawMaterial
} = require('../controllers/masterController');

// ─── PARTIES ────────────────────────────────────────────────────────────────
const partyRouter = express.Router();
partyRouter.use(authenticate);
partyRouter.get('/', getParties);
partyRouter.post('/', masterAdminOnly, createParty);
partyRouter.put('/:id', masterAdminOnly, updateParty);
partyRouter.delete('/:id', masterAdminOnly, deleteParty);

// ─── SKUs ────────────────────────────────────────────────────────────────────
const skuRouter = express.Router();
skuRouter.use(authenticate);
skuRouter.get('/', getSKUs);
skuRouter.get('/:id', getSKU);
skuRouter.post('/', masterAdminOnly, createSKU);
skuRouter.put('/:id', masterAdminOnly, updateSKU);
skuRouter.delete('/:id', masterAdminOnly, deleteSKU);

// ─── RAW MATERIALS ───────────────────────────────────────────────────────────
const rawMaterialRouter = express.Router();
rawMaterialRouter.use(authenticate);
rawMaterialRouter.get('/', getRawMaterials);
rawMaterialRouter.get('/:id', getRawMaterial);
rawMaterialRouter.post('/', masterAdminOnly, createRawMaterial);
rawMaterialRouter.put('/:id', masterAdminOnly, updateRawMaterial);
rawMaterialRouter.delete('/:id', masterAdminOnly, deleteRawMaterial);

// ─── MOULDS ─────────────────────────────────────────────────────────────────
const Mould = require('../models/Mould');
const { createAuditLog } = require('../middleware/audit');
const mouldRouter = express.Router();
mouldRouter.use(authenticate);
mouldRouter.get('/', async (req, res) => {
  const { skuId } = req.query;
  const filter = skuId ? { sku: skuId } : {};
  const moulds = await Mould.find(filter).populate('sku', 'name itemCode');
  res.json({ success: true, data: moulds });
});
mouldRouter.post('/', masterAdminOnly, async (req, res) => {
  const mould = await Mould.create({ ...req.body, createdBy: req.user._id });
  await createAuditLog({ user: req.user, action: 'CREATE', entityType: 'Mould', entityId: mould._id, after: req.body, req });
  res.status(201).json({ success: true, data: mould });
});
mouldRouter.put('/:id', masterAdminOnly, async (req, res) => {
  const mould = await Mould.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user._id }, { new: true });
  if (!mould) return res.status(404).json({ success: false, message: 'Mould not found.' });
  res.json({ success: true, data: mould });
});
mouldRouter.delete('/:id', masterAdminOnly, async (req, res) => {
  await Mould.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: 'Mould deactivated.' });
});

module.exports = { partyRouter, skuRouter, rawMaterialRouter, mouldRouter };
