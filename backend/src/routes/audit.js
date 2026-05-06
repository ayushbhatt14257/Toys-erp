const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { authenticate, masterAdminOnly } = require('../middleware/auth');

router.use(authenticate, masterAdminOnly);

router.get('/', async (req, res) => {
  const { entityType, action, userId, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (entityType) filter.entityType = entityType;
  if (action) filter.action = action;
  if (userId) filter.user = userId;
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('user', 'name email role')
      .sort({ timestamp: -1 })
      .skip(skip).limit(Number(limit)),
    AuditLog.countDocuments(filter)
  ]);
  res.json({ success: true, data: logs, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
});

module.exports = router;
