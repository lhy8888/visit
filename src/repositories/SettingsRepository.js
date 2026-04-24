const config = require('../config/config');
const { openDatabase } = require('../db/sqlite');
const { DEFAULT_TIME_ZONE } = require('../utils/registerNo');

const DEFAULT_SETTINGS = {
  site_title: 'Visitor Register',
  welcome_message: 'Bienvenue dans notre entreprise',
  logo_path: '/images/logo.png',
  default_timezone: DEFAULT_TIME_ZONE,
  pin_length: '6',
  data_retention_days: '30',
  enable_qr_checkin: '1',
  enable_pin_checkin: '1'
};

class SettingsRepository {
  constructor(options = {}) {
    this.dbPath = options.dbPath || config.DB_FILE;
    this.db = openDatabase(this.dbPath, options.migrationsDir);
    this.findOneStatement = this.db.prepare('SELECT key, value, updated_at FROM app_settings WHERE key = ? LIMIT 1');
    this.findAllStatement = this.db.prepare('SELECT key, value, updated_at FROM app_settings ORDER BY key ASC');
    this.upsertStatement = this.db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);
    this.deleteAllStatement = this.db.prepare('DELETE FROM app_settings');
  }

  async get(key, defaultValue = null) {
    const row = this.findOneStatement.get(key);
    return row ? row.value : defaultValue;
  }

  async getAll() {
    const rows = this.findAllStatement.all();
    return rows.reduce((accumulator, row) => {
      accumulator[row.key] = row.value;
      return accumulator;
    }, {});
  }

  async getNumber(key, defaultValue = null) {
    const value = await this.get(key, null);
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }

  async getBoolean(key, defaultValue = false) {
    const value = await this.get(key, null);
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }

    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
  }

  async set(key, value) {
    const now = new Date().toISOString();
    this.upsertStatement.run(key, String(value), now);
    return { key, value: String(value), updatedAt: now };
  }

  async resetToDefaults() {
    const now = new Date().toISOString();

    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.deleteAllStatement.run();

      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        this.upsertStatement.run(key, String(value), now);
      }

      this.db.exec('COMMIT');
      return { ...DEFAULT_SETTINGS };
    } catch (error) {
      try {
        this.db.exec('ROLLBACK');
      } catch (rollbackError) {
        // Ignore rollback errors during cleanup.
      }

      throw error;
    }
  }
}

module.exports = SettingsRepository;
