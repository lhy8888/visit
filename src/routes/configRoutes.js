const express = require('express');
const ConfigController = require('../controllers/ConfigController');

const router = express.Router();
const configController = new ConfigController();

/**
 * Public configuration routes
 */
router.get('/public', configController.getPublicConfig);
router.get('/public/config', configController.getPublicConfig);
router.get('/welcome-message', configController.getWelcomeMessage);

module.exports = router;
