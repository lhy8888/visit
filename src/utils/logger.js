const winston = require('winston');
const path = require('path');
const config = require('../config/config');
const { redactSensitiveData } = require('./privacy');

/**
 * Configuration du logger Winston
 */
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'visitor-management' },
  transports: [
    // Fichier d'erreurs
    new winston.transports.File({
      filename: path.join(path.dirname(config.LOG_FILE), 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Fichier général
    new winston.transports.File({
      filename: config.LOG_FILE,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

function wrapLoggerMethod(methodName) {
  const original = logger[methodName].bind(logger);

  logger[methodName] = (message, meta, ...rest) => {
    if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
      return original(message, redactSensitiveData(meta), ...rest);
    }

    if (meta !== undefined) {
      return original(message, meta, ...rest);
    }

    return original(message);
  };
}

['info', 'warn', 'error'].forEach(wrapLoggerMethod);

// En développement, log aussi dans la console
if (config.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Fonction pour logger les actions utilisateur
 */
logger.logUserAction = (action, details, userContext = {}) => {
  logger.info('User action', {
    action,
    details,
    userContext,
    timestamp: new Date().toISOString()
  });
};

/**
 * Fonction pour logger les erreurs d'API
 */
logger.logApiError = (error, req, res) => {
  logger.error('API Error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    body: req.body,
    query: req.query,
    statusCode: res.statusCode,
    timestamp: new Date().toISOString()
  });
};

/**
 * Fonction pour logger les accès admin
 */
logger.logAdminAccess = (action, success, details = {}) => {
  logger.warn('Admin access', {
    action,
    success,
    details,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;
