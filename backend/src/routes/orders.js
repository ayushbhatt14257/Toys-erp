// routes/orders.js
const express = require('express');
const router = express.Router();
const { getOrders, getOrderDashboard, getOrder, createOrder, updateOrder, markPayment, updateOrderStatus } = require('../controllers/orderController');
const { authenticate, authorize, checkOrderLock } = require('../middleware/auth');

router.use(authenticate);
router.get('/dashboard', getOrderDashboard);
router.get('/', getOrders);
router.get('/:id', getOrder);
router.post('/', authorize('master_admin', 'order_manager'), createOrder);
router.put('/:id', authorize('master_admin', 'order_manager'), checkOrderLock, updateOrder);
router.patch('/:id/payment', authorize('master_admin', 'order_manager'), markPayment);
router.patch('/:id/status', authorize('master_admin', 'order_manager', 'inventory_manager', 'production_manager'), updateOrderStatus);

module.exports = router;
