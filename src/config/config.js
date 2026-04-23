const path = require('path');
require('dotenv').config();

/**
 * Configuration centralisée de l'application
 */
module.exports = {
  // Environnement
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 3001,
  
  // Chemins des fichiers
  DATA_DIR: path.resolve(process.env.DATA_DIR || './data'),
  VISITORS_FILE: path.resolve(process.env.VISITORS_FILE || './data/visitors.json'),
  CONFIG_FILE: path.resolve(process.env.CONFIG_FILE || './data/config.json'),
  DB_FILE: path.resolve(process.env.DB_FILE || './data/visitor.db'),
  UPLOAD_DIR: path.resolve(process.env.UPLOAD_DIR || './public/images'),
  
  // Sécurité
  DEFAULT_PIN_HASH: process.env.DEFAULT_PIN_HASH || '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
  ANONYMIZATION_DAYS: parseInt(process.env.ANONYMIZATION_DAYS) || 30,
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 2000000,
  
  // Rate limiting
  RATE_LIMIT: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW, 10) * 60 * 1000 || (process.env.NODE_ENV === 'test' ? 1 * 60 * 1000 : 15 * 60 * 1000),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || (process.env.NODE_ENV === 'test' ? 1000 : 100)
  },
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: path.resolve(process.env.LOG_FILE || './logs/app.log'),
  
  // Validation
  VALIDATION: {
    PIN_MIN_LENGTH: 4,
    PIN_MAX_LENGTH: 6,
    EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_PATTERN: /^[\d\s\-\.\(\)\+]+$/
  }
};
