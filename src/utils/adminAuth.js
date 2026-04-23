const crypto = require('crypto');
const config = require('../config/config');

const PASSWORD_ALGORITHM = 'pbkdf2';
const PASSWORD_ITERATIONS = 150000;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_DIGEST = 'sha256';
const SESSION_TOKEN_BYTES = 32;

function normalizeString(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function hashAdminPassword(password, options = {}) {
  const normalizedPassword = normalizeString(password);
  if (!normalizedPassword) {
    throw new Error('Password is required');
  }

  const salt = options.salt || crypto.randomBytes(16).toString('hex');
  const iterations = Number.parseInt(options.iterations, 10) || PASSWORD_ITERATIONS;
  const keyLength = Number.parseInt(options.keyLength, 10) || PASSWORD_KEY_LENGTH;
  const digest = options.digest || PASSWORD_DIGEST;
  const derived = crypto.pbkdf2Sync(normalizedPassword, salt, iterations, keyLength, digest);

  return `${PASSWORD_ALGORITHM}$${iterations}$${salt}$${derived.toString('hex')}`;
}

function verifyAdminPassword(password, storedHash) {
  const normalizedPassword = normalizeString(password);
  const normalizedHash = normalizeString(storedHash);

  if (!normalizedPassword || !normalizedHash) {
    return false;
  }

  const parts = normalizedHash.split('$');
  if (parts.length !== 4 || parts[0] !== PASSWORD_ALGORITHM) {
    return false;
  }

  const iterations = Number.parseInt(parts[1], 10);
  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false;
  }

  const salt = parts[2];
  const expectedHex = parts[3];
  if (!salt || !expectedHex) {
    return false;
  }

  const expected = Buffer.from(expectedHex, 'hex');
  if (expected.length === 0) {
    return false;
  }

  const actual = crypto.pbkdf2Sync(
    normalizedPassword,
    salt,
    iterations,
    expected.length,
    PASSWORD_DIGEST
  );

  if (actual.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(actual, expected);
}

function generateSessionToken() {
  return crypto.randomBytes(SESSION_TOKEN_BYTES).toString('hex');
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(normalizeString(token)).digest('hex');
}

function parseCookieHeader(cookieHeader = '') {
  return String(cookieHeader || '')
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce((accumulator, segment) => {
      const separatorIndex = segment.indexOf('=');
      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = segment.slice(0, separatorIndex).trim();
      const value = segment.slice(separatorIndex + 1).trim();
      if (key) {
        accumulator[key] = decodeURIComponent(value);
      }

      return accumulator;
    }, {});
}

function getAdminSessionCookieName() {
  return config.ADMIN_SESSION_COOKIE_NAME || 'visitor_admin_session';
}

function getAdminSessionCookieOptions(maxAgeSeconds) {
  const options = {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: config.NODE_ENV === 'production'
  };

  if (Number.isFinite(maxAgeSeconds) && maxAgeSeconds > 0) {
    options.maxAge = Math.floor(maxAgeSeconds * 1000);
  }

  return options;
}

function extractAdminSessionToken(req) {
  const cookies = parseCookieHeader(req?.headers?.cookie || '');
  return normalizeString(cookies[getAdminSessionCookieName()]);
}

module.exports = {
  extractAdminSessionToken,
  generateSessionToken,
  getAdminSessionCookieName,
  getAdminSessionCookieOptions,
  hashAdminPassword,
  hashSessionToken,
  parseCookieHeader,
  verifyAdminPassword
};
