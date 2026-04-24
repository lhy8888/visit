const logger = require('../utils/logger');

/**
 * Classe pour les erreurs métier
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware de gestion des erreurs
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log de l'erreur
  logger.logApiError(err, req, res);

  // Erreur de validation Joi
  if (err.isJoi) {
    const message = err.details.map(detail => detail.message).join(', ');
    error = new AppError(message, 400);
  }

  // Erreur de JSON malformé
  if (err.type === 'entity.parse.failed') {
    error = new AppError('Invalid JSON payload', 400);
  }

  // File not found
  if (err.code === 'ENOENT') {
    error = new AppError('File not found', 404);
  }

  // Permission error
  if (err.code === 'EACCES') {
    error = new AppError('Insufficient permissions', 403);
  }

  // Multer upload error
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new AppError('File too large', 400);
  }

  // Authentication error
  if (err.name === 'UnauthorizedError') {
    error = new AppError('Unauthorized', 401);
  }

  // Default error
  if (!error.statusCode) {
    error = new AppError('Internal server error', 500);
  }

  // Error response
  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

/**
 * Middleware for missing routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route not found: ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Wrapper for async functions
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler
};
