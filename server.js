const express = require('express');
const path = require('path');
const { assertNodeRuntime } = require('./src/utils/runtime');
assertNodeRuntime();
const config = require('./src/config/config');
const logger = require('./src/utils/logger');

// Middleware
const {
  cors,
  helmet,
  sanitizeInput,
  requestLogger,
  validateHeaders
} = require('./src/middleware/security');

const {
  errorHandler,
  notFoundHandler
} = require('./src/middleware/errorHandler');
// Routes
const configRoutes = require('./src/routes/configRoutes');
const registrationRoutes = require('./src/routes/registrationRoutes');
const receptionRoutes = require('./src/routes/receptionRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

/**
 * Creation of the Express application
 */
const app = express();

/**
 * Security middleware
 */
app.use(helmet);
app.use(cors);
app.use(requestLogger);

/**
 * Body parsing
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Validation and sanitization
 */
app.use(validateHeaders);
app.use(sanitizeInput);

/**
 * Static assets
 */
app.use('/images', express.static(config.UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Pages
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/result/:registerNo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'result.html'));
});

app.get('/reception', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reception.html'));
});

/**
 * API routes
 */
app.use('/api/registrations', registrationRoutes);
app.use('/api', receptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', configRoutes);

app.get('/api/welcome-message', async (req, res, next) => {
  try {
    const ConfigController = require('./src/controllers/ConfigController');
    const controller = new ConfigController();
    await controller.getWelcomeMessage(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Service en ligne',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    version: '2.0.2'
  });
});

/**
 * API information endpoint
 */
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Visitor management API',
    version: '2.0.2',
    endpoints: {
      config: {
        'GET /api/public': 'Get public configuration',
        'GET /api/public/config': 'Get public configuration',
        'GET /api/welcome-message': 'Get welcome message',
        'POST /api/registrations': 'Create a visitor pre-registration',
        'GET /api/registrations/:registerNo': 'Get a pre-registration by number',
        'GET /api/reception/today': 'Get the reception dashboard for today',
        'POST /api/checkin/by-pin': 'Check in by PIN or number',
        'POST /api/checkin/by-qr': 'Check in by QR',
        'POST /api/checkout/:id': 'Check out by visitor ID',
        'POST /api/admin/login': 'Admin authentication',
        'POST /api/admin/logout': 'Admin logout',
        'GET /api/admin/session': 'Check the admin session',
        'GET /api/admin/dashboard/today': 'Today dashboard',
        'GET /api/admin/visitors': 'List visitors with filters',
        'GET /api/admin/stats/summary': 'Statistics summary',
        'GET /api/admin/export.xlsx': 'Export visitors as Excel',
        'PATCH /api/admin/visitors/:id/void': 'Void a visitor record',
        'GET /api/admin/settings': 'Get admin settings',
        'PUT /api/admin/settings': 'Update admin settings'
      }
    }
  });
});

/**
 * Error handling
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Uncaught error handlers
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack
  });

  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', {
    reason: reason,
    promise: promise
  });

  process.exit(1);
});

/**
 * Start the server
 */
const startServer = async () => {
  try {
    const server = app.listen(config.PORT, () => {
      logger.info('Server started', {
        port: config.PORT,
        environment: config.NODE_ENV,
        version: '2.0.2',
        timestamp: new Date().toISOString()
      });

      console.log(`Server online at http://localhost:${config.PORT}`);
      console.log(`Admin interface: http://localhost:${config.PORT}/admin`);
      console.log(`API documentation: http://localhost:${config.PORT}/api`);
      console.log(`Health check: http://localhost:${config.PORT}/health`);
    });

    const gracefulShutdown = (signal) => {
      logger.info(`Signal ${signal} received, shutting down...`);

      server.close(() => {
        logger.info('Server stopped cleanly');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    logger.error('Error while starting server', {
      error: error.message,
      stack: error.stack
    });

    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
