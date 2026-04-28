const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { randomUUID } = require('crypto');
const AdminController = require('../controllers/AdminController');
const config = require('../config/config');
const { AppError } = require('../middleware/errorHandler');
const { requireAdminAuth } = require('../middleware/adminAuth');

const router = express.Router();
const adminController = new AdminController();

fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });

const allowedLogoMimeTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml'
]);

const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      callback(null, config.UPLOAD_DIR);
    },
    filename: (req, file, callback) => {
      const extension = path.extname(file.originalname || '').toLowerCase() || '.png';
      const name = `logo-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`;
      callback(null, name);
    }
  }),
  limits: {
    fileSize: config.MAX_FILE_SIZE
  },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const accepted = allowedLogoMimeTypes.has(file.mimetype) || ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(extension);

    if (!accepted) {
      req.logoUploadError = 'Unsupported logo file type';
      callback(null, false);
      return;
    }

    callback(null, true);
  }
});

const disableAdminCache = (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    Pragma: 'no-cache',
    Expires: '0'
  });
  next();
};

router.use(disableAdminCache);

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
router.post('/logo', requireAdminAuth, logoUpload.single('logo'), adminController.uploadLogo);

module.exports = router;
