const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const ConfigController = require('../controllers/ConfigController');
const { strictLimiter } = require('../middleware/security');
const config = require('../config/config');

const router = express.Router();
const configController = new ConfigController();

const storage = multer.diskStorage({
  destination: config.UPLOAD_DIR,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const allowedLogoExtensions = new Set(['.jpeg', '.jpg', '.png', '.gif', '.svg']);

const isAllowedLogoFile = (file) => {
  if (!file || !file.originalname) {
    return false;
  }

  return allowedLogoExtensions.has(path.extname(file.originalname).toLowerCase());
};

const upload = multer({
  storage: storage,
  limits: { fileSize: config.MAX_FILE_SIZE }
});

const handleLogoUpload = (req, res, next) => {
  upload.single('logo')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(err);
      }

      return next(err);
    }

    if (req.file && !isAllowedLogoFile(req.file)) {
      fs.unlink(req.file.path, () => {});

      return res.status(500).json({
        success: false,
        error: {
          message: 'Seuls les fichiers image (jpeg, jpg, png, gif, svg) sont autorises'
        }
      });
    }

    next();
  });
};

/**
 * Public configuration routes
 */

router.get('/public', configController.getPublicConfig);
router.get('/public/config', configController.getPublicConfig);
router.get('/welcome-message', configController.getWelcomeMessage);

/**
 * Admin routes
 */

router.post('/admin/login', strictLimiter, configController.login);
router.get('/admin/config', configController.getFullConfig);
router.put('/admin/config', configController.updateConfig);
router.post('/admin/change-pin', strictLimiter, configController.changePin);
router.put('/admin/logo', handleLogoUpload, configController.updateLogo);

router.post('/admin/logo', (req, res) => {
  const sendNotFound = () => {
    if (res.headersSent) {
      return;
    }

    res.status(404).json({
      success: false,
      error: {
        message: `Route non trouvée: ${req.originalUrl}`
      }
    });
  };

  if (req.is('multipart/form-data')) {
    req.on('end', sendNotFound);
    req.on('error', () => {
      sendNotFound();
    });
    req.resume();
    return;
  }

  sendNotFound();
});

router.get('/admin/security', configController.getSecuritySettings);
router.post('/admin/config/reset', configController.resetConfig);

module.exports = router;
