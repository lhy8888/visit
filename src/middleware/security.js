const helmet = require('helmet');
const cors = require('cors');
const config = require('../config/config');
const logger = require('../utils/logger');

function resolveCorsOriginConfig() {
  if (config.NODE_ENV !== 'production') {
    return true;
  }

  if (Array.isArray(config.CORS_ORIGINS) && config.CORS_ORIGINS.length > 0) {
    return config.CORS_ORIGINS;
  }

  return false;
}

const corsOptions = {
  origin: resolveCorsOriginConfig(),
  credentials: true,
  optionsSuccessStatus: 200
};

const helmetConfig = config.NODE_ENV === 'production' ? helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}) : helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  hsts: false
});

const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
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

const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('HTTP request', {
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

const validateHeaders = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');

    if (req.originalUrl.includes('/logo')) {
      if (!contentType || (!contentType.includes('multipart/form-data') && !contentType.includes('application/json'))) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Content-Type must be multipart/form-data for file uploads'
          }
        });
      }
    } else if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Content-Type must be application/json'
        }
      });
    }
  }

  next();
};

module.exports = {
  cors: cors(corsOptions),
  helmet: helmetConfig,
  sanitizeInput,
  requestLogger,
  validateHeaders
};
