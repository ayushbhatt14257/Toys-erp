const express = require('express');
const router = express.Router();
const { getBOMs, getBOM, createBOM, updateBOM, deleteBOM, calculateRequirements } = require('../controllers/bomController');
const { authenticate, masterAdminOnly, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/calculate', calculateRequirements);
router.get('/', getBOMs);
router.get('/:id', getBOM);
router.post('/', masterAdminOnly, createBOM);
router.put('/:id', masterAdminOnly, updateBOM);
router.delete('/:id', masterAdminOnly, deleteBOM);

module.exports = router;
