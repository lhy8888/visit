const express = require('express');
const ReceptionController = require('../controllers/ReceptionController');

const router = express.Router();
const receptionController = new ReceptionController();

router.get('/reception/today', receptionController.getTodayDashboard);
router.post('/checkin/by-pin', receptionController.checkInByPin);
router.post('/checkin/by-qr', receptionController.checkInByQr);
router.post('/checkout/:id', receptionController.checkoutVisitor);

module.exports = router;
