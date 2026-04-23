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

/**
 * Création de l'application Express
 */
const app = express();

/**
 * Configuration des middlewares de sécurité
 */
app.use(helmet);
app.use(cors);
app.use(limiter);
app.use(requestLogger);

/**
 * Middleware de parsing
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Middleware de validation et sanitisation
 */
app.use(validateHeaders);
app.use(sanitizeInput);

/**
 * Fichiers statiques
 */
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Routes principales
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

/**
 * Routes API
 */
app.use('/api/visitors', visitorRoutes);
app.use('/api', configRoutes);

/**
 * Endpoints de compatibilité avec l'ancienne API
 */
app.post('/api/check-in', async (req, res, next) => {
  try {
    const VisitorController = require('./src/controllers/VisitorController');
    const controller = new VisitorController();
    await controller.checkIn(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.post('/api/check-out', async (req, res, next) => {
  try {
    const VisitorController = require('./src/controllers/VisitorController');
    const controller = new VisitorController();
    await controller.checkOut(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/stats', async (req, res, next) => {
  try {
    const VisitorController = require('./src/controllers/VisitorController');
    const controller = new VisitorController();
    await controller.getStatistics(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/visitors/current', async (req, res, next) => {
  try {
    const VisitorController = require('./src/controllers/VisitorController');
    const controller = new VisitorController();
    await controller.getCurrentVisitors(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/visitors/history', async (req, res, next) => {
  try {
    const VisitorController = require('./src/controllers/VisitorController');
    const controller = new VisitorController();
    await controller.getAllVisitors(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/clear-visitors', async (req, res, next) => {
  try {
    const VisitorController = require('./src/controllers/VisitorController');
    const controller = new VisitorController();
    await controller.clearAllVisitors(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/generate-test-visitors', async (req, res, next) => {
  try {
    const VisitorController = require('./src/controllers/VisitorController');
    const controller = new VisitorController();
    await controller.generateTestVisitors(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/anonymize', async (req, res, next) => {
  try {
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
    const ConfigController = require('./src/controllers/ConfigController');
    const controller = new ConfigController();
    await controller.getFullConfig(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/config', async (req, res, next) => {
  try {
    const ConfigController = require('./src/controllers/ConfigController');
    const controller = new ConfigController();
    await controller.updateConfig(req, res, next);
  } catch (error) {
    next(error);
  }
});

// Route changement PIN gérée par configRoutes.js

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
 * Endpoint d'informations sur l'API
 */
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API de gestion des visiteurs',
    version: '2.0.0',
    endpoints: {
      visitors: {
        'POST /api/visitors/check-in': 'Enregistrer une arrivée',
        'POST /api/visitors/check-out': 'Enregistrer un départ',
        'GET /api/visitors': 'Obtenir tous les visiteurs',
        'GET /api/visitors/current': 'Obtenir les visiteurs présents',
        'GET /api/visitors/stats': 'Obtenir les statistiques',
        'GET /api/visitors/:id': 'Obtenir un visiteur par ID',
        'GET /api/visitors/range': 'Obtenir les visiteurs par période',
        'POST /api/visitors/anonymize': 'Anonymiser les visiteurs anciens',
        'DELETE /api/visitors/clear': 'Supprimer tous les visiteurs (debug)'
      },
      config: {
        'GET /api/public': 'Obtenir la configuration publique',
        'GET /api/welcome-message': 'Obtenir le message de bienvenue',
        'POST /api/admin/login': 'Authentification admin',
        'GET /api/admin/config': 'Obtenir la configuration complète',
        'PUT /api/admin/config': 'Mettre à jour la configuration',
        'PUT /api/admin/change-pin': 'Changer le code PIN',
        'PUT /api/admin/logo': 'Mettre à jour le logo',
        'GET /api/admin/security': 'Obtenir les paramètres de sécurité'
      }
    }
  });
});

/**
 * Gestion des erreurs
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Gestion des erreurs non capturées
 */
process.on('uncaughtException', (error) => {
  logger.error('Exception non capturée', {
    error: error.message,
    stack: error.stack
  });
  
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesse rejetée non gérée', {
    reason: reason,
    promise: promise
  });
  
  process.exit(1);
});

/**
 * Démarrage du serveur
 */
const startServer = async () => {
  try {
    const server = app.listen(config.PORT, () => {
      logger.info(`Serveur démarré`, {
        port: config.PORT,
        environment: config.NODE_ENV,
        version: '2.0.0',
        timestamp: new Date().toISOString()
      });
      
      console.log(`🚀 Serveur en ligne sur http://localhost:${config.PORT}`);
      console.log(`📊 Interface admin: http://localhost:${config.PORT}/admin`);
      console.log(`🔧 API documentation: http://localhost:${config.PORT}/api`);
      console.log(`❤️  Health check: http://localhost:${config.PORT}/health`);
    });

    // Gestion de l'arrêt propre
    const gracefulShutdown = (signal) => {
      logger.info(`Signal ${signal} reçu, arrêt en cours...`);
      
      server.close(() => {
        logger.info('Serveur arrêté proprement');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Erreur lors du démarrage du serveur', {
      error: error.message,
      stack: error.stack
    });
    
    process.exit(1);
  }
};

// Démarrer le serveur si ce fichier est exécuté directement
if (require.main === module) {
  startServer();
}

module.exports = app;
