const User = require('../models/User');
const { createAuditLog } = require('../middleware/audit');

// GET /api/users
const getUsers = async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, data: users });
};

// POST /api/users
const createUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  const user = await User.create({ name, email, password, role, createdBy: req.user._id });
  await createAuditLog({
    user: req.user, action: 'CREATE', entityType: 'User',
    entityId: user._id, after: { name, email, role }, req
  });
  res.status(201).json({ success: true, data: { _id: user._id, name, email, role } });
};

// PUT /api/users/:id
const updateUser = async (req, res) => {
  const { name, role, isActive } = req.body;
  const before = await User.findById(req.params.id).lean();
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { name, role, isActive, updatedBy: req.user._id },
    { new: true, runValidators: true }
  ).select('-password');
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  await createAuditLog({
    user: req.user, action: 'UPDATE', entityType: 'User',
    entityId: user._id, before, after: { name, role, isActive }, req
  });
  res.json({ success: true, data: user });
};

// DELETE /api/users/:id (soft delete — deactivate)
const deactivateUser = async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ success: false, message: 'Cannot deactivate your own account.' });
  }
  const user = await User.findByIdAndUpdate(
    req.params.id, { isActive: false }, { new: true }
  ).select('-password');
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  await createAuditLog({
    user: req.user, action: 'DELETE', entityType: 'User',
    entityId: user._id, meta: { action: 'deactivated' }, req
  });
  res.json({ success: true, message: 'User deactivated.', data: user });
};

// PUT /api/users/:id/reset-password
const resetPassword = async (req, res) => {
  const { newPassword } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password reset successfully.' });
};

module.exports = { getUsers, createUser, updateUser, deactivateUser, resetPassword };
