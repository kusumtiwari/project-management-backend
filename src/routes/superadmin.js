const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../middleware/authMiddleware');
const SuperAdminController = require('../controllers/SuperAdminController');

// All routes require authentication and superadmin privileges
router.use(protect);
router.use(requireSuperAdmin);

// Create a new admin
router.post('/create-admin', SuperAdminController.createAdmin);

// Get all admins
router.get('/admins', SuperAdminController.getAllAdmins);

// Get all users (admins + members)
router.get('/users', SuperAdminController.getAllUsers);

// Delete an admin (and cascade delete their data)
router.delete('/admin/:adminId', SuperAdminController.deleteAdmin);

// Update admin status (activate/deactivate)
router.put('/admin/:adminId/status', SuperAdminController.updateAdminStatus);

// Get system statistics
router.get('/stats', SuperAdminController.getSystemStats);

module.exports = router;