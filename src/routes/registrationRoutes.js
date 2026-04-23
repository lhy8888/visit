const express = require('express');
const RegistrationController = require('../controllers/RegistrationController');
const { strictLimiter } = require('../middleware/security');

const router = express.Router();
const registrationController = new RegistrationController();

router.post('/', strictLimiter, registrationController.createRegistration);
router.get('/:registerNo', registrationController.getRegistrationByRegisterNo);

module.exports = router;
