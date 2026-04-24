const fs = require('fs');
const path = require('path');
const { assertNodeRuntime } = require('../utils/runtime');

assertNodeRuntime();
const { DatabaseSync } = require('node:sqlite');
const config = require('../config/config');
const logger = require('../utils/logger');

const databaseCache = new Map();

function resolveDatabasePath(dbPath = config.DB_FILE) {
  if (!dbPath || dbPath === ':memory:') {
    return ':memory:';
  }

  return path.resolve(dbPath);
}

function ensureDatabaseDirectory(dbPath) {
  if (!dbPath || dbPath === ':memory:') {
    return;
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

function getMigrationsDirectory(migrationsDir = path.join(__dirname, 'migrations')) {
  return path.resolve(migrationsDir);
}

function ensureMigrationTrackingTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
}

function runMigrations(db, migrationsDir = getMigrationsDirectory()) {
  const resolvedMigrationsDir = getMigrationsDirectory(migrationsDir);
  ensureMigrationTrackingTable(db);

  if (!fs.existsSync(resolvedMigrationsDir)) {
    logger.warn('SQLite migrations directory not found', {
      migrationsDir: resolvedMigrationsDir
    });
    return;
  }

  const appliedRows = db.prepare('SELECT filename FROM schema_migrations').all();
  const applied = new Set(appliedRows.map((row) => row.filename));
  const migrationFiles = fs
    .readdirSync(resolvedMigrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const fileName of migrationFiles) {
    if (applied.has(fileName)) {
      continue;
    }

    const migrationPath = path.join(resolvedMigrationsDir, fileName);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(sql);
      db.prepare(
        'INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)'
      ).run(fileName, new Date().toISOString());
      db.exec('COMMIT');

      logger.info('SQLite migration applied', {
        migration: fileName
      });
    } catch (error) {
      try {
        db.exec('ROLLBACK');
      } catch (rollbackError) {
        logger.warn('SQLite migration rollback failed', {
          rollbackError: rollbackError.message
        });
      }

      throw error;
    }
  }
}

function openDatabase(dbPath = config.DB_FILE, migrationsDir) {
  const resolvedDbPath = resolveDatabasePath(dbPath);
  const resolvedMigrationsDir = getMigrationsDirectory(migrationsDir);
  const cacheKey = `${resolvedDbPath}::${resolvedMigrationsDir}`;

  if (databaseCache.has(cacheKey)) {
    return databaseCache.get(cacheKey);
  }

  ensureDatabaseDirectory(resolvedDbPath);

  const db = new DatabaseSync(resolvedDbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA busy_timeout = 5000;');

  runMigrations(db, resolvedMigrationsDir);

  databaseCache.set(cacheKey, db);
  return db;
}

function closeDatabase(dbPath = config.DB_FILE, migrationsDir) {
  const resolvedDbPath = resolveDatabasePath(dbPath);
  const resolvedMigrationsDir = getMigrationsDirectory(migrationsDir);
  const cacheKey = `${resolvedDbPath}::${resolvedMigrationsDir}`;
  const db = databaseCache.get(cacheKey);

  if (!db) {
    return false;
  }

  db.close();
  databaseCache.delete(cacheKey);
  return true;
}

module.exports = {
  closeDatabase,
  getMigrationsDirectory,
  openDatabase,
  resolveDatabasePath,
  runMigrations
};
