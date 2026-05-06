const AuditLog = require('../models/AuditLog');

const createAuditLog = async ({ user, action, entityType, entityId, entityRef, before, after, meta, req }) => {
  try {
    await AuditLog.create({
      user: user._id,
      userName: user.name,
      userRole: user.role,
      action,
      entityType,
      entityId,
      entityRef,
      before,
      after,
      meta,
      ip: req?.ip
    });
  } catch (err) {
    // Audit log failures should never crash the app
    console.error('Audit log error:', err.message);
  }
};

module.exports = { createAuditLog };
