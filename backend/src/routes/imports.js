const express = require('express');
const router = express.Router();
const { upload, importParties, importSKUs, importRawMaterials, importInventory } = require('../controllers/importController');
const { authenticate, masterAdminOnly, authorize } = require('../middleware/auth');

router.use(authenticate);
router.post('/parties', masterAdminOnly, upload.single('file'), importParties);
router.post('/skus', masterAdminOnly, upload.single('file'), importSKUs);
router.post('/raw-materials', masterAdminOnly, upload.single('file'), importRawMaterials);
router.post('/inventory', authorize('master_admin', 'inventory_manager'), upload.single('file'), importInventory);

module.exports = router;
