const express = require('express');
const RegistrationController = require('../controllers/RegistrationController');
const { attachReceptionSession } = require('../middleware/receptionAccess');

const router = express.Router();
const registrationController = new RegistrationController();

router.use(attachReceptionSession);

router.post('/', registrationController.createRegistration);
router.get('/:registerNo', registrationController.getRegistrationByRegisterNo);

module.exports = router;
