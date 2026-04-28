const path = require('path');
require('dotenv').config();

/**
 * Centralized application configuration.
 */
module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3001,
  DATA_DIR: path.resolve(process.env.DATA_DIR || './data'),
  DB_FILE: path.resolve(process.env.DB_FILE || './data/visitor.db'),
  UPLOAD_DIR: path.resolve(process.env.UPLOAD_DIR || './public/images'),

  ADMIN_DEFAULT_USERNAME: process.env.ADMIN_DEFAULT_USERNAME || 'admin',
  ADMIN_DEFAULT_PASSWORD: process.env.ADMIN_DEFAULT_PASSWORD || '123456',
  ADMIN_SESSION_COOKIE_NAME: process.env.ADMIN_SESSION_COOKIE_NAME || 'visitor_admin_session',
  ADMIN_SESSION_TTL_HOURS: parseInt(process.env.ADMIN_SESSION_TTL_HOURS, 10) || 12,
  RECEPTION_SESSION_COOKIE_NAME: process.env.RECEPTION_SESSION_COOKIE_NAME || 'visitor_reception_session',
  RECEPTION_SESSION_TTL_HOURS: parseInt(process.env.RECEPTION_SESSION_TTL_HOURS, 10) || 12,
  RECEPTION_SESSION_SECRET: process.env.RECEPTION_SESSION_SECRET || null,
  CORS_ORIGINS: String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  ANONYMIZATION_DAYS: parseInt(process.env.ANONYMIZATION_DAYS, 10) || 365,
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE, 10) || 2000000,

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: path.resolve(process.env.LOG_FILE || './logs/app.log'),

  VALIDATION: {
    PIN_MIN_LENGTH: 4,
    PIN_MAX_LENGTH: 6,
    EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_PATTERN: /^[\d\s\-\.\(\)\+]+$/
  }
};
