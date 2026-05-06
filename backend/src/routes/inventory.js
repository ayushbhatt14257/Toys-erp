const express = require('express');
const router = express.Router();
const { getInventory, getInventoryDashboard, getStockBySKU, stockIn, bulkStockIn, adjustStock } = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/dashboard', getInventoryDashboard);
router.get('/', getInventory);
router.get('/:skuId', getStockBySKU);
router.post('/stock-in', authorize('master_admin', 'inventory_manager'), stockIn);
router.post('/bulk-stock-in', authorize('master_admin', 'inventory_manager'), bulkStockIn);
router.post('/adjust', authorize('master_admin', 'inventory_manager'), adjustStock);

module.exports = router;
