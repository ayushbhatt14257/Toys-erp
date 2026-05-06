const express = require('express');
const router = express.Router();
const { getJobs, getDashboard, getJob, createJob, startJob, completeJob, cancelJob } = require('../controllers/productionController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/dashboard', getDashboard);
router.get('/', getJobs);
router.get('/:id', getJob);
router.post('/', authorize('master_admin', 'production_manager'), createJob);
router.patch('/:id/start', authorize('master_admin', 'production_manager'), startJob);
router.patch('/:id/complete', authorize('master_admin', 'production_manager'), completeJob);
router.patch('/:id/cancel', authorize('master_admin', 'production_manager'), cancelJob);

module.exports = router;
