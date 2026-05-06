const XLSX = require('xlsx');
const multer = require('multer');
const Party = require('../models/Party');
const SKU = require('../models/SKU');
const RawMaterial = require('../models/RawMaterial');
const InventoryStock = require('../models/InventoryStock');
const { createAuditLog } = require('../middleware/audit');

// Multer — memory storage (no disk write)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel', 'text/csv'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed.'));
    }
  }
});

const parseExcel = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
};

// POST /api/imports/parties
const importParties = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
  const rows = parseExcel(req.file.buffer);
  const results = { success: [], failed: [] };

  for (const row of rows) {
    try {
      const party = await Party.findOneAndUpdate(
        { name: row['Party Name'] || row['name'] },
        {
          name: row['Party Name'] || row['name'],
          contactPerson: row['Contact Person'] || row['contactPerson'],
          phone: row['Phone'] || row['phone'],
          email: row['Email'] || row['email'],
          address: row['Address'] || row['address'],
          city: row['City'] || row['city'],
          state: row['State'] || row['state'],
          gstNo: row['GST No'] || row['gstNo'],
          createdBy: req.user._id
        },
        { upsert: true, new: true, runValidators: true }
      );
      results.success.push(party.name);
    } catch (err) {
      results.failed.push({ row, reason: err.message });
    }
  }

  await createAuditLog({
    user: req.user, action: 'IMPORT', entityType: 'Party',
    meta: { successCount: results.success.length, failedCount: results.failed.length }, req
  });

  res.json({ success: true, data: results });
};

// POST /api/imports/skus
const importSKUs = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
  const rows = parseExcel(req.file.buffer);
  const results = { success: [], failed: [] };

  for (const row of rows) {
    try {
      const sku = await SKU.findOneAndUpdate(
        { itemCode: (row['Item Code'] || row['itemCode'] || '').toUpperCase() },
        {
          name: row['Item Name'] || row['name'],
          itemCode: (row['Item Code'] || row['itemCode'] || '').toUpperCase(),
          category: (row['Category'] || row['category'] || 'other').toLowerCase().replace(' ', '_'),
          unit: (row['Unit'] || row['unit'] || 'pcs').toLowerCase(),
          description: row['Description'] || row['description'],
          basePrice: Number(row['Base Price'] || row['basePrice'] || 0),
          createdBy: req.user._id
        },
        { upsert: true, new: true, runValidators: true }
      );
      results.success.push(sku.name);
    } catch (err) {
      results.failed.push({ row, reason: err.message });
    }
  }

  await createAuditLog({
    user: req.user, action: 'IMPORT', entityType: 'SKU',
    meta: { successCount: results.success.length, failedCount: results.failed.length }, req
  });

  res.json({ success: true, data: results });
};

// POST /api/imports/raw-materials
const importRawMaterials = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
  const rows = parseExcel(req.file.buffer);
  const results = { success: [], failed: [] };

  for (const row of rows) {
    try {
      const material = await RawMaterial.findOneAndUpdate(
        { name: row['Material Name'] || row['name'] },
        {
          name: row['Material Name'] || row['name'],
          code: row['Code'] || row['code'] || undefined,
          unit: (row['Unit'] || row['unit'] || 'pcs').toLowerCase(),
          qtyOnHand: Number(row['Opening Stock'] || row['qtyOnHand'] || 0),
          reorderLevel: Number(row['Reorder Level'] || row['reorderLevel'] || 0),
          createdBy: req.user._id
        },
        { upsert: true, new: true, runValidators: true }
      );
      results.success.push(material.name);
    } catch (err) {
      results.failed.push({ row, reason: err.message });
    }
  }

  await createAuditLog({
    user: req.user, action: 'IMPORT', entityType: 'RawMaterial',
    meta: { successCount: results.success.length, failedCount: results.failed.length }, req
  });

  res.json({ success: true, data: results });
};

// POST /api/imports/inventory
const importInventory = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
  const rows = parseExcel(req.file.buffer);
  const results = { success: [], failed: [] };

  for (const row of rows) {
    try {
      const sku = await SKU.findOne({
        $or: [
          { itemCode: (row['Item Code'] || '').toUpperCase() },
          { name: row['Item Name'] || row['name'] }
        ]
      });
      if (!sku) { results.failed.push({ row, reason: 'SKU not found' }); continue; }

      const qty = Number(row['Quantity'] || row['qty'] || 0);
      let stock = await InventoryStock.findOne({ sku: sku._id });
      if (!stock) stock = await InventoryStock.create({ sku: sku._id, qtyOnHand: 0, qtyReserved: 0 });
      stock.qtyOnHand += qty;
      stock.transactions.push({ type: 'stock_in', quantity: qty, notes: 'Bulk import', performedBy: req.user._id });
      stock.updatedBy = req.user._id;
      await stock.save();
      results.success.push({ skuName: sku.name, qty });
    } catch (err) {
      results.failed.push({ row, reason: err.message });
    }
  }

  res.json({ success: true, data: results });
};

module.exports = { upload, importParties, importSKUs, importRawMaterials, importInventory };
