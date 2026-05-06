const Order = require('../models/Order');
const InventoryStock = require('../models/InventoryStock');
const SKU = require('../models/SKU');
const { createAuditLog } = require('../middleware/audit');

// GET /api/orders
const getOrders = async (req, res) => {
  const { status, party, page = 1, limit = 20, search } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (party) filter.party = party;
  if (search) filter.orderNumber = { $regex: search, $options: 'i' };

  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('party', 'name')
      .populate('items.sku', 'name itemCode unit')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Order.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: { total, page: Number(page), pages: Math.ceil(total / limit) }
  });
};

// GET /api/orders/dashboard
const getOrderDashboard = async (req, res) => {
  const [statusCounts, paymentStats] = await Promise.all([
    Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Order.aggregate([
      { $group: {
        _id: '$paymentReceived',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }}
    ])
  ]);
  res.json({ success: true, data: { statusCounts, paymentStats } });
};

// GET /api/orders/:id
const getOrder = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('party', 'name contactPerson phone')
    .populate('items.sku', 'name itemCode unit category')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name')
    .populate('lockedBy', 'name');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  res.json({ success: true, data: order });
};

// POST /api/orders
const createOrder = async (req, res) => {
  const { party, dateOfReceipt, deliveryDate, transporterName, transporterDetails, items, notes } = req.body;

  // Enrich items with itemCode from SKU
  const enrichedItems = await Promise.all(items.map(async (item) => {
    const sku = await SKU.findById(item.sku);
    return { ...item, itemCode: sku?.itemCode };
  }));

  const order = await Order.create({
    party, dateOfReceipt, deliveryDate, transporterName,
    transporterDetails, items: enrichedItems, notes,
    createdBy: req.user._id
  });

  await createAuditLog({
    user: req.user, action: 'CREATE', entityType: 'Order',
    entityId: order._id, entityRef: order.orderNumber, after: req.body, req
  });

  // Check inventory availability for each item
  await checkAndUpdateInventoryStatus(order);

  const populated = await Order.findById(order._id)
    .populate('party', 'name')
    .populate('items.sku', 'name itemCode unit');

  res.status(201).json({ success: true, data: populated });
};

// PUT /api/orders/:id — uses checkOrderLock middleware
const updateOrder = async (req, res) => {
  const before = req.order.toObject();
  const { party, dateOfReceipt, deliveryDate, transporterName, transporterDetails, items, notes } = req.body;

  // Re-enrich items
  const enrichedItems = await Promise.all(items.map(async (item) => {
    const sku = await SKU.findById(item.sku);
    return { ...item, itemCode: sku?.itemCode };
  }));

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { party, dateOfReceipt, deliveryDate, transporterName, transporterDetails, items: enrichedItems, notes, updatedBy: req.user._id },
    { new: true, runValidators: true }
  ).populate('party', 'name').populate('items.sku', 'name itemCode unit');

  await createAuditLog({
    user: req.user, action: 'UPDATE', entityType: 'Order',
    entityId: order._id, entityRef: order.orderNumber, before, after: req.body, req
  });

  res.json({ success: true, data: order });
};

// PATCH /api/orders/:id/payment — mark payment received (locks order)
const markPayment = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  if (order.isLocked) {
    return res.status(400).json({ success: false, message: 'Order is already locked.' });
  }
  const before = order.toObject();
  order.paymentReceived = true;
  order.lockedBy = req.user._id;
  order.lockedAt = new Date();
  await order.save();

  await createAuditLog({
    user: req.user, action: 'PAYMENT_LOCK', entityType: 'Order',
    entityId: order._id, entityRef: order.orderNumber,
    before: { paymentReceived: false, isLocked: false },
    after: { paymentReceived: true, isLocked: true },
    req
  });

  res.json({ success: true, message: 'Payment marked. Order is now locked.', data: order });
};

// PATCH /api/orders/:id/status
const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  const before = { status: order.status };
  order.status = status;
  order.updatedBy = req.user._id;
  await order.save();
  await createAuditLog({
    user: req.user, action: 'UPDATE', entityType: 'Order',
    entityId: order._id, entityRef: order.orderNumber,
    before, after: { status }, req
  });
  res.json({ success: true, data: order });
};

// Internal: check inventory and update order item statuses
const checkAndUpdateInventoryStatus = async (order) => {
  for (const item of order.items) {
    const stock = await InventoryStock.findOne({ sku: item.sku });
    const available = stock ? (stock.qtyOnHand - stock.qtyReserved) : 0;
    if (available >= item.quantity) {
      item.status = 'reserved';
      // Reserve stock
      if (stock) {
        stock.qtyReserved += item.quantity;
        stock.transactions.push({
          type: 'reserved', quantity: item.quantity,
          reference: order.orderNumber, referenceId: order._id
        });
        await stock.save();
      }
    } else {
      item.status = 'shortfall';
    }
  }
  // Update order status based on items
  const allReserved = order.items.every(i => i.status === 'reserved');
  const anyShortfall = order.items.some(i => i.status === 'shortfall');
  if (allReserved) order.status = 'in_inventory';
  else if (anyShortfall) order.status = 'confirmed'; // waiting for production
  await order.save();
};

module.exports = { getOrders, getOrderDashboard, getOrder, createOrder, updateOrder, markPayment, updateOrderStatus };
