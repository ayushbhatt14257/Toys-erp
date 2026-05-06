const InventoryStock = require('../models/InventoryStock');
const SKU = require('../models/SKU');
const { createAuditLog } = require('../middleware/audit');

// GET /api/inventory
const getInventory = async (req, res) => {
  const { lowStock } = req.query;
  let stocks = await InventoryStock.find()
    .populate('sku', 'name itemCode category unit')
    .sort({ updatedAt: -1 });

  if (lowStock === 'true') {
    stocks = stocks.filter(s => s.qtyAvailable <= 10);
  }

  res.json({ success: true, count: stocks.length, data: stocks });
};

// GET /api/inventory/dashboard
const getInventoryDashboard = async (req, res) => {
  const stocks = await InventoryStock.find().populate('sku', 'name itemCode category');
  const totalSKUs = stocks.length;
  const lowStock = stocks.filter(s => s.qtyAvailable <= 10).length;
  const outOfStock = stocks.filter(s => s.qtyAvailable <= 0).length;
  res.json({ success: true, data: { totalSKUs, lowStock, outOfStock, stocks } });
};

// GET /api/inventory/:skuId
const getStockBySKU = async (req, res) => {
  const stock = await InventoryStock.findOne({ sku: req.params.skuId })
    .populate('sku', 'name itemCode category unit');
  if (!stock) return res.status(404).json({ success: false, message: 'No stock record found for this SKU.' });
  res.json({ success: true, data: stock });
};

// POST /api/inventory/stock-in — manual stock addition
const stockIn = async (req, res) => {
  const { skuId, quantity, notes } = req.body;
  if (!skuId || !quantity || quantity <= 0) {
    return res.status(400).json({ success: false, message: 'SKU and valid quantity are required.' });
  }
  const sku = await SKU.findById(skuId);
  if (!sku) return res.status(404).json({ success: false, message: 'SKU not found.' });

  let stock = await InventoryStock.findOne({ sku: skuId });
  if (!stock) {
    stock = await InventoryStock.create({ sku: skuId, qtyOnHand: 0, qtyReserved: 0 });
  }

  const before = { qtyOnHand: stock.qtyOnHand };
  stock.qtyOnHand += quantity;
  stock.transactions.push({
    type: 'stock_in', quantity, notes,
    performedBy: req.user._id
  });
  stock.updatedBy = req.user._id;
  await stock.save();

  await createAuditLog({
    user: req.user, action: 'STOCK_IN', entityType: 'InventoryStock',
    entityId: stock._id, entityRef: sku.name,
    before, after: { qtyOnHand: stock.qtyOnHand }, meta: { quantity, notes }, req
  });

  res.json({ success: true, message: `Stock updated. ${sku.name}: ${stock.qtyOnHand} ${sku.unit}`, data: stock });
};

// POST /api/inventory/bulk-stock-in — from parsed Excel/CSV
const bulkStockIn = async (req, res) => {
  const { items } = req.body;
  // items: [{ skuId, quantity, notes }]
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Items array is required.' });
  }

  const results = { success: [], failed: [] };

  for (const item of items) {
    try {
      const sku = await SKU.findById(item.skuId);
      if (!sku) { results.failed.push({ item, reason: 'SKU not found' }); continue; }
      let stock = await InventoryStock.findOne({ sku: item.skuId });
      if (!stock) stock = await InventoryStock.create({ sku: item.skuId, qtyOnHand: 0, qtyReserved: 0 });
      stock.qtyOnHand += item.quantity;
      stock.transactions.push({ type: 'stock_in', quantity: item.quantity, notes: item.notes || 'Bulk import', performedBy: req.user._id });
      stock.updatedBy = req.user._id;
      await stock.save();
      results.success.push({ skuName: sku.name, quantity: item.quantity });
    } catch (err) {
      results.failed.push({ item, reason: err.message });
    }
  }

  await createAuditLog({
    user: req.user, action: 'IMPORT', entityType: 'InventoryStock',
    meta: { successCount: results.success.length, failedCount: results.failed.length }, req
  });

  res.json({ success: true, data: results });
};

// POST /api/inventory/adjust — manual adjustment
const adjustStock = async (req, res) => {
  const { skuId, quantity, notes } = req.body;
  const stock = await InventoryStock.findOne({ sku: skuId });
  if (!stock) return res.status(404).json({ success: false, message: 'Stock record not found.' });
  const before = { qtyOnHand: stock.qtyOnHand };
  stock.qtyOnHand = quantity;
  stock.transactions.push({ type: 'adjustment', quantity, notes, performedBy: req.user._id });
  stock.updatedBy = req.user._id;
  await stock.save();
  await createAuditLog({
    user: req.user, action: 'STOCK_ADJUST', entityType: 'InventoryStock',
    entityId: stock._id, before, after: { qtyOnHand: quantity }, meta: { notes }, req
  });
  res.json({ success: true, data: stock });
};

module.exports = { getInventory, getInventoryDashboard, getStockBySKU, stockIn, bulkStockIn, adjustStock };
