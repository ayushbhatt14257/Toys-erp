const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deactivateUser, resetPassword } = require('../controllers/userController');
const { authenticate, masterAdminOnly } = require('../middleware/auth');

router.use(authenticate, masterAdminOnly);
router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deactivateUser);
router.put('/:id/reset-password', resetPassword);

module.exports = router;
