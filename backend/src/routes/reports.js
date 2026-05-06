// routes/reports.js
const express = require('express');
const router = express.Router();
const { exportOrdersExcel, exportInventoryExcel, exportProductionJobPDF, exportRawMaterialsExcel } = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/orders/excel', exportOrdersExcel);
router.get('/inventory/excel', exportInventoryExcel);
router.get('/production/:jobId/pdf', exportProductionJobPDF);
router.get('/raw-materials/excel', exportRawMaterialsExcel);

module.exports = router;
