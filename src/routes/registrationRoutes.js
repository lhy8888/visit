const express = require('express');
const RegistrationController = require('../controllers/RegistrationController');

const router = express.Router();
const registrationController = new RegistrationController();

router.post('/', registrationController.createRegistration);
router.get('/:registerNo', registrationController.getRegistrationByRegisterNo);

module.exports = router;
