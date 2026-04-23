const config = require('../config/config');
const { openDatabase } = require('../db/sqlite');

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
}

module.exports = SettingsRepository;
