const crypto = require('crypto');
const config = require('../config/config');
const { AppError } = require('../middleware/errorHandler');
const { parseCookieHeader } = require('./adminAuth');

const DEFAULT_COOKIE_NAME = 'visitor_reception_session';
const DEFAULT_TTL_HOURS = 12;

function normalizeString(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function getReceptionSessionCookieName() {
  return config.RECEPTION_SESSION_COOKIE_NAME || DEFAULT_COOKIE_NAME;
}

function getReceptionSessionSecret() {
  return config.RECEPTION_SESSION_SECRET
    || `${config.DB_FILE}:${config.PORT}:${config.NODE_ENV}:reception`;
}

function getReceptionSessionTtlHours() {
  const ttlHours = Number.parseInt(config.RECEPTION_SESSION_TTL_HOURS, 10);
  return Number.isInteger(ttlHours) && ttlHours > 0 ? ttlHours : DEFAULT_TTL_HOURS;
}

function getReceptionSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: config.NODE_ENV === 'production',
    maxAge: getReceptionSessionTtlHours() * 60 * 60 * 1000
  };
}

function signReceptionPayload(payload) {
  return crypto.createHmac('sha256', getReceptionSessionSecret())
    .update(payload)
    .digest('hex');
}

function createReceptionSessionToken(now = new Date()) {
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + getReceptionSessionTtlHours() * 60 * 60 * 1000).toISOString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = [issuedAt, expiresAt, nonce].join('|');
  const signature = signReceptionPayload(payload);
  return `${payload}|${signature}`;
}

function verifyReceptionSessionToken(token) {
  const normalizedToken = normalizeString(token);
  if (!normalizedToken) {
    return null;
  }

  const parts = normalizedToken.split('|');
  if (parts.length !== 4) {
    return null;
  }

  const [issuedAt, expiresAt, nonce, signature] = parts;
  const payload = [issuedAt, expiresAt, nonce].join('|');
  const expectedSignature = signReceptionPayload(payload);
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');

  if (
    expectedBuffer.length === 0
    || actualBuffer.length === 0
    || expectedBuffer.length !== actualBuffer.length
    || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return null;
  }

  const expiresAtDate = new Date(expiresAt);
  if (Number.isNaN(expiresAtDate.getTime()) || expiresAtDate <= new Date()) {
    return null;
  }

  return {
    issuedAt,
    expiresAt,
    nonce
  };
}

function extractReceptionSessionToken(req) {
  const cookies = parseCookieHeader(req?.headers?.cookie || '');
  return normalizeString(cookies[getReceptionSessionCookieName()]);
}

function issueReceptionSessionCookie(res, now = new Date()) {
  const token = createReceptionSessionToken(now);
  res.cookie(getReceptionSessionCookieName(), token, getReceptionSessionCookieOptions());
  return token;
}

function attachReceptionSession(req, res, next) {
  const token = extractReceptionSessionToken(req);
  req.receptionSession = verifyReceptionSessionToken(token);
  next();
}

function requireReceptionAccess(req, res, next) {
  try {
    const token = extractReceptionSessionToken(req);
    const session = verifyReceptionSessionToken(token);
    if (!session) {
      throw new AppError('Reception session required', 401);
    }

    req.receptionSession = session;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  attachReceptionSession,
  createReceptionSessionToken,
  extractReceptionSessionToken,
  getReceptionSessionCookieName,
  getReceptionSessionCookieOptions,
  getReceptionSessionSecret,
  getReceptionSessionTtlHours,
  issueReceptionSessionCookie,
  requireReceptionAccess,
  verifyReceptionSessionToken
};
