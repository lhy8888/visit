const express = require('express');
const ReceptionController = require('../controllers/ReceptionController');
const { requireReceptionAccess } = require('../middleware/receptionAccess');

const router = express.Router();
const receptionController = new ReceptionController();

router.get('/reception/today', requireReceptionAccess, receptionController.getTodayDashboard);
router.post('/checkin/by-pin', requireReceptionAccess, receptionController.checkInByPin);
router.post('/checkin/by-qr', requireReceptionAccess, receptionController.checkInByQr);
router.post('/checkout/:id', requireReceptionAccess, receptionController.checkoutVisitor);

module.exports = router;
