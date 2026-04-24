const express = require('express');
const path = require('path');
const config = require('./src/config/config');
const logger = require('./src/utils/logger');

// Middleware
const {
  cors,
  helmet,
  limiter,
  sanitizeInput,
  requestLogger,
  validateHeaders
} = require('./src/middleware/security');

const {
  errorHandler,
  notFoundHandler
} = require('./src/middleware/errorHandler');

// Routes
const visitorRoutes = require('./src/routes/visitorRoutes');
const configRoutes = require('./src/routes/configRoutes');
const registrationRoutes = require('./src/routes/registrationRoutes');
const receptionRoutes = require('./src/routes/receptionRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

/**
 * Creation of the Express application
 */
const app = express();

const setLegacyRouteHeaders = (res, message, replacement) => {
  res.setHeader('Deprecation', 'true');
  res.setHeader('X-Deprecated-Endpoint', 'true');
  res.setHeader('X-Deprecated-Message', message);

  if (replacement) {
    res.setHeader('Link', `<${replacement}>; rel="alternate"`);
  }
};

/**
 * Security middleware
 */
app.use(helmet);
app.use(cors);
app.use(limiter);
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
app.use('/api/visitors', visitorRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api', receptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', configRoutes);

/**
 * Legacy compatibility endpoints
 */
app.post('/api/check-in', async (req, res, next) => {
  try {
    setLegacyRouteHeaders(
      res,
      'Legacy check-in endpoint. Use POST /api/registrations.',
      '/api/registrations'
    );
    const VisitorController = require('./src/controllers/VisitorController');
    const controller = new VisitorController();
    await controller.checkIn(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.post('/api/check-out', async (req, res, next) => {
  try {
    setLegacyRouteHeaders(
      res,
      'Legacy check-out endpoint. Use POST /api/checkout/:id after check-in.',
      '/api/checkout/:id'
    );
    const VisitorController = require('./src/controllers/VisitorController');
    const controller = new VisitorController();
    await controller.checkOut(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/stats', async (req, res, next) => {
  try {
    setLegacyRouteHeaders(
      res,
      'Legacy admin statistics endpoint. Use GET /api/admin/stats/summary.',
      '/api/admin/stats/summary'
    );
    const VisitorController = require('./src/controllers/VisitorController');
    const controller = new VisitorController();
    await controller.getStatistics(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/visitors/current', async (req, res, next) => {
  try {
    setLegacyRouteHeaders(
      res,
      'Legacy current visitors endpoint. Use GET /api/reception/today or GET /api/admin/dashboard/today.',
      '/api/admin/dashboard/today'
    );
    const VisitorController = require('./src/controllers/VisitorController');
    const controller = new VisitorController();
    await controller.getCurrentVisitors(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/visitors/history', async (req, res, next) => {
  try {
    setLegacyRouteHeaders(
      res,
      'Legacy history endpoint. Use GET /api/admin/visitors.',
      '/api/admin/visitors'
    );
    const VisitorController = require('./src/controllers/VisitorController');
    const controller = new VisitorController();
    await controller.getAllVisitors(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/clear-visitors', async (req, res, next) => {
  try {
    setLegacyRouteHeaders(
      res,
      'Legacy debug endpoint. Avoid in production.',
      '/api/admin/dashboard/today'
    );
    const VisitorController = require('./src/controllers/VisitorController');
    const controller = new VisitorController();
    await controller.clearAllVisitors(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/generate-test-visitors', async (req, res, next) => {
  try {
    setLegacyRouteHeaders(
      res,
      'Legacy debug endpoint. Avoid in production.',
      '/api/registrations'
    );
    const VisitorController = require('./src/controllers/VisitorController');
    const controller = new VisitorController();
    await controller.generateTestVisitors(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/anonymize', async (req, res, next) => {
  try {
    setLegacyRouteHeaders(
      res,
      'Legacy anonymize endpoint. Use retention settings in /api/admin/settings.',
      '/api/admin/settings'
    );
    const VisitorController = require('./src/controllers/VisitorController');
    const controller = new VisitorController();
    await controller.anonymizeOldVisitors(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.get('/api/welcome-message', async (req, res, next) => {
  try {
    const ConfigController = require('./src/controllers/ConfigController');
    const controller = new ConfigController();
    await controller.getWelcomeMessage(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/config', async (req, res, next) => {
  try {
    setLegacyRouteHeaders(
      res,
      'Legacy admin config endpoint. Use GET /api/admin/settings.',
      '/api/admin/settings'
    );
    const ConfigController = require('./src/controllers/ConfigController');
    const controller = new ConfigController();
    await controller.getFullConfig(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/config', async (req, res, next) => {
  try {
    setLegacyRouteHeaders(
      res,
      'Legacy admin config endpoint. Use PUT /api/admin/settings.',
      '/api/admin/settings'
    );
    const ConfigController = require('./src/controllers/ConfigController');
    const controller = new ConfigController();
    await controller.updateConfig(req, res, next);
  } catch (error) {
    next(error);
  }
});

// Legacy PIN change handled by configRoutes.js

app.post('/api/admin/login', async (req, res, next) => {
  try {
    const ConfigController = require('./src/controllers/ConfigController');
    const controller = new ConfigController();
    await controller.login(req, res, next);
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
    version: '2.0.0'
  });
});

/**
 * API information endpoint
 */
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Visitor management API',
    version: '2.0.0',
    endpoints: {
      visitors: {
        'POST /api/visitors/check-in': 'Register a visitor arrival',
        'POST /api/visitors/check-out': 'Register a visitor departure',
        'GET /api/visitors': 'Get all visitors',
        'GET /api/visitors/current': 'Get current visitors',
        'GET /api/visitors/stats': 'Get visitor statistics',
        'GET /api/visitors/:id': 'Get a visitor by ID',
        'GET /api/visitors/range': 'Get visitors by date range',
        'POST /api/visitors/anonymize': 'Anonymize old visitors',
        'DELETE /api/visitors/clear': 'Delete all visitors (debug)'
      },
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
        'GET /api/admin/export.csv': 'Export visitors as CSV',
        'PATCH /api/admin/visitors/:id/void': 'Void a visitor record',
        'GET /api/admin/settings': 'Get admin settings',
        'PUT /api/admin/settings': 'Update admin settings',
        'GET /api/admin/config': 'Get full configuration',
        'PUT /api/admin/config': 'Update configuration',
        'PUT /api/admin/change-pin': 'Change the PIN code',
        'PUT /api/admin/logo': 'Update the logo',
        'GET /api/admin/security': 'Get security settings'
      },
      deprecated: {
        visitors: {
          'POST /api/check-in': 'Legacy compatibility route. Use POST /api/registrations.',
          'POST /api/check-out': 'Legacy compatibility route. Use POST /api/checkout/:id.',
          'GET /api/admin/stats': 'Legacy compatibility route. Use GET /api/admin/stats/summary.',
          'GET /api/admin/visitors/current': 'Legacy compatibility route. Use GET /api/admin/dashboard/today.',
          'GET /api/admin/visitors/history': 'Legacy compatibility route. Use GET /api/admin/visitors.',
          'POST /api/admin/clear-visitors': 'Legacy debug route. Avoid in production.',
          'POST /api/admin/generate-test-visitors': 'Legacy debug route. Avoid in production.',
          'POST /api/admin/anonymize': 'Legacy route. Use retention settings in /api/admin/settings.'
        },
        config: {
          'GET /api/admin/config': 'Legacy route. Use GET /api/admin/settings.',
          'PUT /api/admin/config': 'Legacy route. Use PUT /api/admin/settings.',
          'POST /api/admin/change-pin': 'Legacy route. PIN-only admin flow is deprecated.',
          'PUT /api/admin/logo': 'Legacy route. Admin settings now handle branding.',
          'GET /api/admin/security': 'Legacy route. Security settings moved into /api/admin/settings.'
        }
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
        version: '2.0.0',
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
