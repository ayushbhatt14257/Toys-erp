const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const Order = require('../models/Order');
const InventoryStock = require('../models/InventoryStock');
const ProductionJob = require('../models/ProductionJob');
const RawMaterial = require('../models/RawMaterial');

// GET /api/reports/orders/excel
const exportOrdersExcel = async (req, res) => {
  const { status, from, to } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const orders = await Order.find(filter)
    .populate('party', 'name')
    .populate('items.sku', 'name itemCode')
    .sort({ createdAt: -1 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Orders');

  sheet.columns = [
    { header: 'Order No', key: 'orderNumber', width: 18 },
    { header: 'Party', key: 'party', width: 25 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Delivery Date', key: 'deliveryDate', width: 14 },
    { header: 'Items', key: 'items', width: 40 },
    { header: 'Total Amount', key: 'totalAmount', width: 16 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Payment', key: 'payment', width: 12 }
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  orders.forEach(order => {
    const itemsSummary = order.items.map(i => `${i.sku?.name} x${i.quantity}`).join(', ');
    sheet.addRow({
      orderNumber: order.orderNumber,
      party: order.party?.name,
      date: order.dateOfReceipt?.toLocaleDateString('en-IN'),
      deliveryDate: order.deliveryDate?.toLocaleDateString('en-IN') || '-',
      items: itemsSummary,
      totalAmount: order.totalAmount,
      status: order.status,
      payment: order.paymentReceived ? 'Received' : 'Pending'
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=orders.xlsx');
  await workbook.xlsx.write(res);
  res.end();
};

// GET /api/reports/inventory/excel
const exportInventoryExcel = async (req, res) => {
  const stocks = await InventoryStock.find()
    .populate('sku', 'name itemCode category unit');

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Inventory');
  sheet.columns = [
    { header: 'Item Name', key: 'name', width: 25 },
    { header: 'Item Code', key: 'itemCode', width: 16 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Unit', key: 'unit', width: 10 },
    { header: 'On Hand', key: 'onHand', width: 12 },
    { header: 'Reserved', key: 'reserved', width: 12 },
    { header: 'Available', key: 'available', width: 12 }
  ];
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };

  stocks.forEach(s => {
    const row = sheet.addRow({
      name: s.sku?.name,
      itemCode: s.sku?.itemCode,
      category: s.sku?.category,
      unit: s.sku?.unit,
      onHand: s.qtyOnHand,
      reserved: s.qtyReserved,
      available: s.qtyAvailable
    });
    if (s.qtyAvailable <= 0) row.getCell('available').font = { color: { argb: 'FFCC0000' }, bold: true };
    else if (s.qtyAvailable <= 10) row.getCell('available').font = { color: { argb: 'FFFF8800' } };
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=inventory.xlsx');
  await workbook.xlsx.write(res);
  res.end();
};

// GET /api/reports/production/pdf/:jobId
const exportProductionJobPDF = async (req, res) => {
  const job = await ProductionJob.findById(req.params.jobId)
    .populate('items.sku', 'name itemCode')
    .populate('items.bom', 'variantName')
    .populate('items.mould', 'code partsPerShot')
    .populate('items.materialRequirements.rawMaterial', 'name unit')
    .populate('createdBy', 'name');

  if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=production-${job.jobNumber}.pdf`);
  doc.pipe(res);

  // Header
  doc.fontSize(20).font('Helvetica-Bold').text('Production Job Sheet', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').text(`Job Number: ${job.jobNumber}`, { align: 'center' });
  doc.moveDown(1);

  // Job details
  doc.fontSize(11).font('Helvetica-Bold').text('Job Details');
  doc.font('Helvetica').fontSize(10);
  doc.text(`Status: ${job.status.replace(/_/g, ' ').toUpperCase()}`);
  doc.text(`Created By: ${job.createdBy?.name}`);
  doc.text(`Created At: ${job.createdAt?.toLocaleDateString('en-IN')}`);
  if (job.plannedStartDate) doc.text(`Planned Start: ${job.plannedStartDate.toLocaleDateString('en-IN')}`);
  if (job.notes) doc.text(`Notes: ${job.notes}`);
  doc.moveDown(1);

  // Items
  job.items.forEach((item, idx) => {
    doc.fontSize(11).font('Helvetica-Bold').text(`Item ${idx + 1}: ${item.sku?.name} (${item.sku?.itemCode})`);
    doc.fontSize(10).font('Helvetica');
    doc.text(`  BOM Variant: ${item.bom?.variantName || 'N/A'}`);
    doc.text(`  Quantity to Make: ${item.qtyToMake}`);
    if (item.mould) doc.text(`  Mould: ${item.mould.code} (${item.mould.partsPerShot} parts/shot) — ${item.shotsRequired} shots`);
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica-Bold').text('  Raw Material Requirements:');
    doc.font('Helvetica');
    item.materialRequirements?.forEach(req => {
      const avail = req.isAvailable ? '✓' : '✗ SHORTAGE';
      doc.text(`    • ${req.rawMaterial?.name}: ${req.required} ${req.unit} ${avail}`);
    });
    doc.moveDown(1);
  });

  doc.end();
};

// GET /api/reports/raw-materials/excel
const exportRawMaterialsExcel = async (req, res) => {
  const materials = await RawMaterial.find({ isActive: true }).sort({ name: 1 });
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Raw Materials');
  sheet.columns = [
    { header: 'Material Name', key: 'name', width: 28 },
    { header: 'Code', key: 'code', width: 14 },
    { header: 'Unit', key: 'unit', width: 10 },
    { header: 'Stock On Hand', key: 'qty', width: 16 },
    { header: 'Reorder Level', key: 'reorder', width: 16 },
    { header: 'Status', key: 'status', width: 14 }
  ];
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  materials.forEach(m => {
    const row = sheet.addRow({
      name: m.name, code: m.code || '-', unit: m.unit,
      qty: m.qtyOnHand, reorder: m.reorderLevel,
      status: m.qtyOnHand <= m.reorderLevel ? 'Low Stock' : 'OK'
    });
    if (m.qtyOnHand <= m.reorderLevel) row.getCell('status').font = { color: { argb: 'FFCC0000' }, bold: true };
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=raw-materials.xlsx');
  await workbook.xlsx.write(res);
  res.end();
};

module.exports = { exportOrdersExcel, exportInventoryExcel, exportProductionJobPDF, exportRawMaterialsExcel };
