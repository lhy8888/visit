const express = require('express');
const ReceptionController = require('../controllers/ReceptionController');
const { strictLimiter } = require('../middleware/security');

const router = express.Router();
const receptionController = new ReceptionController();

router.get('/reception/today', receptionController.getTodayDashboard);
router.post('/checkin/by-pin', strictLimiter, receptionController.checkInByPin);
router.post('/checkin/by-qr', strictLimiter, receptionController.checkInByQr);
router.post('/checkout/:id', strictLimiter, receptionController.checkoutVisitor);

module.exports = router;
