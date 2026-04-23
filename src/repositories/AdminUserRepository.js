const { randomUUID } = require('crypto');
const config = require('../config/config');
const logger = require('../utils/logger');
const { openDatabase } = require('../db/sqlite');
const {
  generateSessionToken,
  hashAdminPassword,
  hashSessionToken,
  verifyAdminPassword
} = require('../utils/adminAuth');

function mapAdminUserRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAdminSessionRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.session_id || row.id,
    tokenHash: row.token_hash,
    adminUserId: row.admin_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    lastSeenAt: row.last_seen_at,
    revokedAt: row.revoked_at || null,
    user: row.username
      ? {
          id: row.admin_user_id,
          username: row.username,
          createdAt: row.user_created_at || row.user_created_at,
          updatedAt: row.user_updated_at || row.user_updated_at
        }
      : null
  };
}

class AdminUserRepository {
  constructor(options = {}) {
    this.dbPath = options.dbPath || config.DB_FILE;
    this.db = openDatabase(this.dbPath, options.migrationsDir);

    this.countUsersStatement = this.db.prepare('SELECT COUNT(*) AS count FROM admin_users');
    this.findUserByIdStatement = this.db.prepare(
      'SELECT id, username, created_at, updated_at FROM admin_users WHERE id = ? LIMIT 1'
    );
    this.findUserByUsernameStatement = this.db.prepare(
      'SELECT id, username, password_hash, created_at, updated_at FROM admin_users WHERE username = ? LIMIT 1'
    );
    this.insertUserStatement = this.db.prepare(`
      INSERT INTO admin_users (id, username, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    this.updateUserPasswordStatement = this.db.prepare(`
      UPDATE admin_users
      SET password_hash = ?, updated_at = ?
      WHERE id = ?
    `);

    this.insertSessionStatement = this.db.prepare(`
      INSERT INTO admin_sessions (
        id,
        token_hash,
        admin_user_id,
        created_at,
        updated_at,
        expires_at,
        last_seen_at,
        revoked_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
    `);
    this.findSessionByTokenStatement = this.db.prepare(`
      SELECT
        s.id AS session_id,
        s.token_hash,
        s.admin_user_id,
        s.created_at,
        s.updated_at,
        s.expires_at,
        s.last_seen_at,
        s.revoked_at,
        u.username,
        u.created_at AS user_created_at,
        u.updated_at AS user_updated_at
      FROM admin_sessions s
      INNER JOIN admin_users u ON u.id = s.admin_user_id
      WHERE s.token_hash = ?
      LIMIT 1
    `);
    this.touchSessionStatement = this.db.prepare(`
      UPDATE admin_sessions
      SET last_seen_at = ?, updated_at = ?
      WHERE token_hash = ? AND revoked_at IS NULL
    `);
    this.revokeSessionStatement = this.db.prepare(`
      UPDATE admin_sessions
      SET revoked_at = ?, updated_at = ?
      WHERE token_hash = ?
    `);
    this.deleteExpiredSessionsStatement = this.db.prepare(`
      DELETE FROM admin_sessions
      WHERE expires_at <= ? OR revoked_at IS NOT NULL
    `);

    this.ensureDefaultAdmin();
  }

  ensureDefaultAdmin() {
    const defaultUsername = String(config.ADMIN_DEFAULT_USERNAME || 'admin').trim();
    const defaultPassword = String(config.ADMIN_DEFAULT_PASSWORD || '123456');

    if (!defaultUsername || !defaultPassword) {
      logger.warn('Default admin credentials are not configured', {
        defaultUsername
      });
      return null;
    }

    const existing = this.findByUsername(defaultUsername);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const adminUser = {
      id: randomUUID(),
      username: defaultUsername,
      passwordHash: hashAdminPassword(defaultPassword),
      createdAt: now,
      updatedAt: now
    };

    this.insertUserStatement.run(
      adminUser.id,
      adminUser.username,
      adminUser.passwordHash,
      adminUser.createdAt,
      adminUser.updatedAt
    );

    logger.logUserAction('admin_user_seeded', {
      username: adminUser.username
    });

    return this.findByUsername(defaultUsername);
  }

  findById(id) {
    const normalizedId = String(id || '').trim();
    if (!normalizedId) {
      return null;
    }

    const row = this.findUserByIdStatement.get(normalizedId);
    return mapAdminUserRow(row);
  }

  findByUsername(username) {
    const normalizedUsername = String(username || '').trim();
    if (!normalizedUsername) {
      return null;
    }

    const row = this.findUserByUsernameStatement.get(normalizedUsername);
    return row ? { ...mapAdminUserRow(row), passwordHash: row.password_hash } : null;
  }

  authenticateWithPassword(username, password) {
    const user = this.findByUsername(username);
    if (!user) {
      return null;
    }

    if (!verifyAdminPassword(password, user.passwordHash)) {
      return null;
    }

    return user;
  }

  createUser(username, password) {
    const normalizedUsername = String(username || '').trim();
    const normalizedPassword = String(password || '');

    if (!normalizedUsername || !normalizedPassword) {
      throw new Error('Username and password are required');
    }

    const existing = this.findByUsername(normalizedUsername);
    if (existing) {
      throw new Error('Admin user already exists');
    }

    const now = new Date().toISOString();
    const user = {
      id: randomUUID(),
      username: normalizedUsername,
      passwordHash: hashAdminPassword(normalizedPassword),
      createdAt: now,
      updatedAt: now
    };

    this.insertUserStatement.run(
      user.id,
      user.username,
      user.passwordHash,
      user.createdAt,
      user.updatedAt
    );

    return mapAdminUserRow({
      id: user.id,
      username: user.username,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    });
  }

  updatePassword(userId, password) {
    const normalizedId = String(userId || '').trim();
    const normalizedPassword = String(password || '');
    if (!normalizedId || !normalizedPassword) {
      throw new Error('User id and password are required');
    }

    const now = new Date().toISOString();
    this.updateUserPasswordStatement.run(hashAdminPassword(normalizedPassword), now, normalizedId);
    return this.findById(normalizedId);
  }

  createSession(adminUserId, options = {}) {
    const normalizedUserId = String(adminUserId || '').trim();
    if (!normalizedUserId) {
      throw new Error('Admin user id is required');
    }

    const now = options.now || new Date().toISOString();
    const ttlHours = Number.parseInt(options.ttlHours, 10) || config.ADMIN_SESSION_TTL_HOURS || 12;
    const expiresAt = new Date(new Date(now).getTime() + ttlHours * 60 * 60 * 1000).toISOString();
    const rawToken = generateSessionToken();
    const tokenHash = hashSessionToken(rawToken);
    const sessionId = randomUUID();

    this.insertSessionStatement.run(
      sessionId,
      tokenHash,
      normalizedUserId,
      now,
      now,
      expiresAt,
      now
    );

    return {
      id: sessionId,
      token: rawToken,
      tokenHash,
      adminUserId: normalizedUserId,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      lastSeenAt: now
    };
  }

  getSessionByToken(token) {
    const normalizedToken = String(token || '').trim();
    if (!normalizedToken) {
      return null;
    }

    const tokenHash = hashSessionToken(normalizedToken);
    const row = this.findSessionByTokenStatement.get(tokenHash);
    if (!row) {
      return null;
    }

    if (row.revoked_at) {
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(row.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= now) {
      return null;
    }

    const touchedAt = now.toISOString();
    this.touchSessionStatement.run(touchedAt, touchedAt, tokenHash);

    return mapAdminSessionRow(row);
  }

  revokeSessionByToken(token) {
    const normalizedToken = String(token || '').trim();
    if (!normalizedToken) {
      return false;
    }

    const tokenHash = hashSessionToken(normalizedToken);
    const now = new Date().toISOString();
    this.revokeSessionStatement.run(now, now, tokenHash);
    return true;
  }

  cleanupExpiredSessions() {
    const now = new Date().toISOString();
    this.deleteExpiredSessionsStatement.run(now);
  }

  countUsers() {
    const row = this.countUsersStatement.get();
    return Number(row?.count || 0);
  }
}

module.exports = AdminUserRepository;
