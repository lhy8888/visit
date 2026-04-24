const express = require('express');
const AdminController = require('../controllers/AdminController');
const { requireAdminAuth } = require('../middleware/adminAuth');

const router = express.Router();
const adminController = new AdminController();

router.post('/login', adminController.login);
router.post('/logout', adminController.logout);
router.get('/session', adminController.getSession);

router.get('/dashboard/today', requireAdminAuth, adminController.getTodayDashboard);
router.get('/visitors', requireAdminAuth, adminController.listVisitors);
router.get('/stats/summary', requireAdminAuth, adminController.getSummaryStats);
router.get('/export.xlsx', requireAdminAuth, adminController.exportVisitors);
router.patch('/visitors/:id/void', requireAdminAuth, adminController.voidVisitor);
router.get('/settings', requireAdminAuth, adminController.getSettings);
router.put('/settings', requireAdminAuth, adminController.updateSettings);

module.exports = router;
