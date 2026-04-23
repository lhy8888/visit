const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Configuration CORS
 */
const corsOptions = {
  origin: config.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Remplacer par votre domaine
    : true, // Permettre toutes les origines en développement
  credentials: true,
  optionsSuccessStatus: 200
};

/**
 * Configuration du rate limiting
 */
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT.windowMs,
  max: config.RATE_LIMIT.max,
  message: {
    success: false,
    error: {
      message: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('Rate limit dépassé', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl,
      timestamp: new Date().toISOString()
    });
    
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * Rate limiting spécifique pour les endpoints sensibles
 */
const strictLimiter = rateLimit({
  windowMs: config.NODE_ENV === 'development' ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 minute en dev, 15 minutes en prod
  max: config.NODE_ENV === 'production' ? 5 : 100, // 5 tentatives en prod, plus large en dev/test
  message: {
    success: false,
    error: {
      message: 'Trop de tentatives d\'authentification, veuillez réessayer plus tard.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('Rate limit strict dépassé', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl,
      timestamp: new Date().toISOString()
    });
    
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * Configuration Helmet pour la sécurité
 */
const helmetConfig = config.NODE_ENV === 'production' ? helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}) : helmet({
  contentSecurityPolicy: false, // Désactiver CSP en développement
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  hsts: false
});

/**
 * Middleware de sanitisation des inputs
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitize(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  if (req.query) {
    req.query = sanitize(req.query);
  }
  
  next();
};

/**
 * Middleware de logging des requêtes
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('Requête HTTP', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  });
  
  next();
};

/**
 * Middleware de validation des headers
 */
const validateHeaders = (req, res, next) => {
  // Vérifier Content-Type pour les POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    
    // Permettre multipart/form-data pour les uploads de fichiers
    if (req.originalUrl.includes('/logo')) {
      if (!contentType || (!contentType.includes('multipart/form-data') && !contentType.includes('application/json'))) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Content-Type doit être multipart/form-data pour les uploads de fichiers'
          }
        });
      }
    } else {
      // Pour les autres endpoints, exiger application/json
      if (!contentType || !contentType.includes('application/json')) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Content-Type doit être application/json'
          }
        });
      }
    }
  }
  
  next();
};

module.exports = {
  cors: cors(corsOptions),
  helmet: helmetConfig,
  limiter,
  strictLimiter,
  sanitizeInput,
  requestLogger,
  validateHeaders
};
