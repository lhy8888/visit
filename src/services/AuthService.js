const config = require('../config/config');
const ConfigRepository = require('../repositories/ConfigRepository');
const AdminUserRepository = require('../repositories/AdminUserRepository');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const {
  extractAdminSessionToken,
  getAdminSessionCookieOptions,
  getAdminSessionCookieName
} = require('../utils/adminAuth');

function toNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeAdminUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt || user.created_at || null,
    updatedAt: user.updatedAt || user.updated_at || null
  };
}

function buildSessionPayload(session) {
  if (!session) {
    return null;
  }

  return {
    id: session.id,
    expiresAt: session.expiresAt,
    lastSeenAt: session.lastSeenAt,
    createdAt: session.createdAt,
    user: sanitizeAdminUser(session.user)
  };
}

class AuthService {
  constructor(options = {}) {
    this.adminUserRepository = options.adminUserRepository || new AdminUserRepository();
    this.configRepository = options.configRepository || new ConfigRepository();
  }

  async login(credentials = {}) {
    try {
      const username = toNullableString(credentials.username || credentials.user);
      const password = toNullableString(credentials.password);
      const pin = toNullableString(credentials.pin);

      let user = null;
      let authMode = null;

      if (username || password) {
        if (!username || !password) {
          throw new AppError('Identifiants administrateur requis', 400);
        }

        user = this.adminUserRepository.authenticateWithPassword(username, password);
        authMode = 'password';

        if (!user) {
          throw new AppError('Identifiants administrateur invalides', 401);
        }
      } else if (pin) {
        const isValidPin = await this.configRepository.verifyPin(pin);
        authMode = 'pin';

        if (!isValidPin) {
          throw new AppError('Code PIN incorrect', 401);
        }

        user = this.adminUserRepository.ensureDefaultAdmin();
      } else {
        throw new AppError('Le code PIN est requis', 400);
      }

      const session = this.adminUserRepository.createSession(user.id);
      logger.logAdminAccess('login', true, {
        username: user.username,
        authMode
      });

      return {
        user: sanitizeAdminUser(user),
        session: buildSessionPayload(session),
        token: session.token,
        authMode,
        cookieName: getAdminSessionCookieName(),
        cookieOptions: getAdminSessionCookieOptions(
          (Number(config.ADMIN_SESSION_TTL_HOURS) || 12) * 60 * 60
        )
      };
    } catch (error) {
      logger.logAdminAccess('login', false, {
        error: error.message
      });
      throw error;
    }
  }

  async getSession(token) {
    const session = this.adminUserRepository.getSessionByToken(token);
    if (!session) {
      return null;
    }

    return buildSessionPayload(session);
  }

  async getSessionFromRequest(req) {
    const token = extractAdminSessionToken(req);
    if (!token) {
      return null;
    }

    return this.getSession(token);
  }

  async logout(token) {
    if (!token) {
      return false;
    }

    return this.adminUserRepository.revokeSessionByToken(token);
  }
}

module.exports = AuthService;
