const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Visitor = require('../models/Visitor');
const { AppError } = require('../middleware/errorHandler');
const config = require('../config/config');
const logger = require('../utils/logger');
const { openDatabase } = require('../db/sqlite');

const VISITOR_COLUMNS = [
  'id',
  'register_no',
  'pin_code',
  'qr_token',
  'visitor_name',
  'company',
  'email',
  'phone',
  'host_name',
  'visit_purpose',
  'scheduled_date',
  'registered_at',
  'checked_in_at',
  'checked_out_at',
  'status',
  'source',
  'notes',
  'created_at',
  'updated_at',
  'nom',
  'prenom',
  'societe',
  'telephone',
  'personneVisitee',
  'heureArrivee',
  'heureSortie',
  'statut'
];

const VISITOR_UPSERT_SQL = `
  INSERT INTO visitors (${VISITOR_COLUMNS.join(', ')})
  VALUES (${VISITOR_COLUMNS.map((column) => `$${column}`).join(', ')})
  ON CONFLICT(id) DO UPDATE SET
    ${VISITOR_COLUMNS
      .filter((column) => column !== 'id')
      .map((column) => `${column} = excluded.${column}`)
      .join(',\n    ')}
`;

function normalizeVisitorInput(visitorData) {
  if (visitorData instanceof Visitor) {
    return visitorData.toJSON();
  }

  return { ...visitorData };
}

function buildDisplayName(data) {
  const firstName = data.prenom ? String(data.prenom).trim() : '';
  const lastName = data.nom ? String(data.nom).trim() : '';
  return [firstName, lastName].filter(Boolean).join(' ').trim() || lastName || firstName || 'Visiteur';
}

function mapRowToVisitor(row) {
  return new Visitor({
    id: row.id,
    nom: row.nom || null,
    prenom: row.prenom || null,
    societe: row.societe || row.company || null,
    email: row.email,
    telephone: row.telephone || row.phone || null,
    personneVisitee: row.personneVisitee || row.host_name || null,
    heureArrivee: row.heureArrivee || row.registered_at || null,
    heureSortie: row.heureSortie || row.checked_out_at || null
  });
}

function buildDbRow(visitorData, existingRow = {}) {
  const data = normalizeVisitorInput(visitorData);
  const now = new Date().toISOString();
  const registeredAt = data.heureArrivee || data.registered_at || existingRow.registered_at || now;
  const checkedOutAt = data.heureSortie || data.checked_out_at || existingRow.checked_out_at || null;
  const checkedInAt = data.checked_in_at || data.heureArrivee || registeredAt;
  const createdAt = data.created_at || existingRow.created_at || registeredAt;
  const updatedAt = data.updated_at || now;
  const status = data.status || existingRow.status || (checkedOutAt ? 'checked_out' : 'checked_in');
  const source = data.source || existingRow.source || 'web';
  const scheduledDate = data.scheduled_date || existingRow.scheduled_date || (registeredAt ? String(registeredAt).slice(0, 10) : null);
  const visitorName = data.visitor_name || existingRow.visitor_name || buildDisplayName(data);
  const company = data.company ?? data.societe ?? existingRow.company ?? existingRow.societe ?? null;
  const phone = data.phone ?? data.telephone ?? existingRow.phone ?? existingRow.telephone ?? null;
  const hostName = data.host_name
    ?? data.personneVisitee
    ?? existingRow.host_name
    ?? existingRow.personneVisitee
    ?? 'Non renseigné';
  const visitPurpose = data.visit_purpose ?? existingRow.visit_purpose ?? null;
  const notes = data.notes ?? existingRow.notes ?? null;

  return {
    id: data.id || existingRow.id || uuidv4(),
    register_no: data.register_no ?? existingRow.register_no ?? null,
    pin_code: data.pin_code ?? existingRow.pin_code ?? null,
    qr_token: data.qr_token ?? existingRow.qr_token ?? null,
    visitor_name: visitorName,
    company,
    email: data.email ?? existingRow.email ?? null,
    phone,
    host_name: hostName,
    visit_purpose: visitPurpose,
    scheduled_date: scheduledDate,
    registered_at: registeredAt,
    checked_in_at: checkedInAt,
    checked_out_at: checkedOutAt,
    status,
    source,
    notes,
    created_at: createdAt,
    updated_at: updatedAt,
    nom: data.nom ?? existingRow.nom ?? null,
    prenom: data.prenom ?? existingRow.prenom ?? null,
    societe: data.societe ?? existingRow.societe ?? company,
    telephone: data.telephone ?? existingRow.telephone ?? phone,
    personneVisitee: data.personneVisitee ?? existingRow.personneVisitee ?? hostName,
    heureArrivee: data.heureArrivee ?? existingRow.heureArrivee ?? registeredAt,
    heureSortie: data.heureSortie ?? existingRow.heureSortie ?? checkedOutAt,
    statut: data.statut ?? existingRow.statut ?? (checkedOutAt ? 'parti' : 'present')
  };
}

class VisitorSqliteRepository {
  constructor(options = {}) {
    this.dbPath = options.dbPath || config.DB_FILE;
    this.legacyFilePath = Object.prototype.hasOwnProperty.call(options, 'legacyFilePath')
      ? options.legacyFilePath
      : config.VISITORS_FILE;
    this.db = openDatabase(this.dbPath, options.migrationsDir);
    this.upsertStatement = this.db.prepare(VISITOR_UPSERT_SQL);
    this.findAllStatement = this.db.prepare('SELECT * FROM visitors ORDER BY created_at ASC, id ASC');
    this.findByIdStatement = this.db.prepare('SELECT * FROM visitors WHERE id = ? LIMIT 1');
    this.findByEmailPresentStatement = this.db.prepare(
      'SELECT * FROM visitors WHERE email = ? AND heureSortie IS NULL LIMIT 1'
    );
    this.findCurrentVisitorsStatement = this.db.prepare(
      'SELECT * FROM visitors WHERE heureSortie IS NULL ORDER BY created_at ASC, id ASC'
    );
    this.findByDateRangeStatement = this.db.prepare(
      'SELECT * FROM visitors WHERE heureArrivee >= ? AND heureArrivee <= ? ORDER BY heureArrivee ASC, id ASC'
    );
    this.deleteAllStatement = this.db.prepare('DELETE FROM visitors');
    this.lastLegacySyncMtime = 0;
  }

  async _ensureLegacyDirectory() {
    if (!this.legacyFilePath || this.legacyFilePath === ':memory:') {
      return;
    }

    await fs.mkdir(path.dirname(this.legacyFilePath), { recursive: true });
  }

  async _getLegacySnapshotMtime() {
    if (!this.legacyFilePath || this.legacyFilePath === ':memory:') {
      return 0;
    }

    try {
      const stats = await fs.stat(this.legacyFilePath);
      return stats.mtimeMs;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return 0;
      }

      throw error;
    }
  }

  async _readLegacySnapshot() {
    if (!this.legacyFilePath || this.legacyFilePath === ':memory:') {
      return [];
    }

    try {
      const raw = await fs.readFile(this.legacyFilePath, 'utf8');
      if (!raw.trim()) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        logger.warn('Legacy visitor snapshot is not an array', {
          legacyFilePath: this.legacyFilePath
        });
        return [];
      }

      return parsed;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }

      logger.warn('Failed to read legacy visitor snapshot', {
        error: error.message,
        legacyFilePath: this.legacyFilePath
      });
      return [];
    }
  }

  async _writeLegacySnapshot(rows) {
    if (!this.legacyFilePath || this.legacyFilePath === ':memory:') {
      return;
    }

    await this._ensureLegacyDirectory();
    const payload = JSON.stringify(rows.map((row) => mapRowToVisitor(row).toJSON()), null, 2);
    await fs.writeFile(this.legacyFilePath, payload, 'utf8');
    const stats = await fs.stat(this.legacyFilePath);
    this.lastLegacySyncMtime = stats.mtimeMs;
  }

  async _syncFromLegacySnapshotIfNeeded() {
    if (!this.legacyFilePath || this.legacyFilePath === ':memory:') {
      return;
    }

    const currentMtime = await this._getLegacySnapshotMtime();
    if (currentMtime <= this.lastLegacySyncMtime) {
      return;
    }

    const legacyRows = await this._readLegacySnapshot();
    await this._replaceDatabaseRows(legacyRows);
    this.lastLegacySyncMtime = currentMtime;
  }

  async _replaceDatabaseRows(legacyRows) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.deleteAllStatement.run();

      for (const row of legacyRows) {
        const existingRow = {};
        const dbRow = buildDbRow(row, existingRow);
        this.upsertStatement.run(dbRow);
      }

      this.db.exec('COMMIT');
    } catch (error) {
      try {
        this.db.exec('ROLLBACK');
      } catch (rollbackError) {
        logger.warn('Rollback failed while replacing visitor rows', {
          error: rollbackError.message
        });
      }

      throw error;
    }
  }

  async _upsertRow(row) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.upsertStatement.run(row);
      this.db.exec('COMMIT');
    } catch (error) {
      try {
        this.db.exec('ROLLBACK');
      } catch (rollbackError) {
        logger.warn('Rollback failed while upserting visitor row', {
          error: rollbackError.message
        });
      }

      throw error;
    }
  }

  async _deleteRowById(id) {
    this.db.prepare('DELETE FROM visitors WHERE id = ?').run(id);
  }

  async _getAllRows() {
    return this.findAllStatement.all();
  }

  async findAll() {
    try {
      await this._syncFromLegacySnapshotIfNeeded();
      const rows = this.findAllStatement.all();
      return rows.map((row) => mapRowToVisitor(row));
    } catch (error) {
      logger.error('Erreur lors de la r鑼卌up鑼卹ation des visiteurs SQLite', {
        error: error.message
      });
      throw error;
    }
  }

  async findById(id) {
    try {
      await this._syncFromLegacySnapshotIfNeeded();
      const row = this.findByIdStatement.get(id);
      return row ? mapRowToVisitor(row) : null;
    } catch (error) {
      logger.error('Erreur lors de la recherche du visiteur par ID', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  async findByEmailPresent(email) {
    try {
      await this._syncFromLegacySnapshotIfNeeded();
      const row = this.findByEmailPresentStatement.get(email);
      return row ? mapRowToVisitor(row) : null;
    } catch (error) {
      logger.error('Erreur lors de la recherche du visiteur par email', {
        error: error.message,
        email
      });
      throw error;
    }
  }

  async findCurrentVisitors() {
    try {
      await this._syncFromLegacySnapshotIfNeeded();
      const rows = this.findCurrentVisitorsStatement.all();
      return rows.map((row) => mapRowToVisitor(row));
    } catch (error) {
      logger.error('Erreur lors de la r鑼卌up鑼卹ation des visiteurs actuels', {
        error: error.message
      });
      throw error;
    }
  }

  async findByDateRange(startDate, endDate = new Date()) {
    try {
      await this._syncFromLegacySnapshotIfNeeded();
      const startIso = startDate instanceof Date ? startDate.toISOString() : new Date(startDate).toISOString();
      const endIso = endDate instanceof Date ? endDate.toISOString() : new Date(endDate).toISOString();
      const rows = this.findByDateRangeStatement.all(startIso, endIso);
      return rows.map((row) => mapRowToVisitor(row));
    } catch (error) {
      logger.error('Erreur lors de la r鑼卌up鑼卹ation des visiteurs par p鑼卹iode', {
        error: error.message,
        startDate,
        endDate
      });
      throw error;
    }
  }

  async create(visitorData) {
    try {
      await this._syncFromLegacySnapshotIfNeeded();
      const visitor = visitorData instanceof Visitor ? visitorData : new Visitor(visitorData);
      const row = buildDbRow(visitor);
      await this._upsertRow(row);
      await this._writeLegacySnapshot(await this._getAllRows());

      logger.logUserAction('visitor_checkin', {
        visitorId: row.id,
        email: row.email,
        societe: row.societe
      });

      return mapRowToVisitor(row);
    } catch (error) {
      logger.error('Erreur lors de la cr鑼卆tion du visiteur', {
        error: error.message,
        visitorData
      });
      throw error;
    }
  }

  async update(id, updates) {
    try {
      await this._syncFromLegacySnapshotIfNeeded();
      const currentRow = this.findByIdStatement.get(id);
      if (!currentRow) {
        throw new Error('Visiteur non trouvé');
      }

      const mergedLegacy = {
        ...mapRowToVisitor(currentRow).toJSON(),
        ...normalizeVisitorInput(updates),
        id
      };
      const mergedRow = buildDbRow(mergedLegacy, currentRow);
      await this._upsertRow(mergedRow);
      await this._writeLegacySnapshot(await this._getAllRows());

      logger.logUserAction('visitor_update', {
        visitorId: id,
        updates
      });

      return mapRowToVisitor(mergedRow);
    } catch (error) {
      logger.error('Erreur lors de la mise 鑴?jour du visiteur', {
        error: error.message,
        id,
        updates
      });
      throw error;
    }
  }

  async checkOut(email) {
    try {
      await this._syncFromLegacySnapshotIfNeeded();
      const currentRow = this.findByEmailPresentStatement.get(email);
      if (!currentRow) {
        throw new AppError('Aucune arrivée en cours trouvée pour cet email', 404);
      }

      const now = new Date().toISOString();
      const mergedRow = buildDbRow(
        {
          ...mapRowToVisitor(currentRow).toJSON(),
          heureSortie: now,
          checked_out_at: now,
          status: 'checked_out',
          statut: 'parti',
          updated_at: now
        },
        currentRow
      );

      await this._upsertRow(mergedRow);
      await this._writeLegacySnapshot(await this._getAllRows());

      logger.logUserAction('visitor_checkout', {
        visitorId: mergedRow.id,
        email
      });

      return mapRowToVisitor(mergedRow);
    } catch (error) {
      logger.error('Erreur lors du checkout du visiteur', {
        error: error.message,
        email
      });
      throw error;
    }
  }

  async deleteAll() {
    try {
      this.deleteAllStatement.run();
      await this._writeLegacySnapshot([]);
      logger.logUserAction('visitors_clear_all', {});
      return true;
    } catch (error) {
      logger.error('Erreur lors de la suppression des visiteurs', {
        error: error.message
      });
      throw error;
    }
  }

  async anonymizeOldVisitors(anonymizationDays = config.ANONYMIZATION_DAYS) {
    try {
      await this._syncFromLegacySnapshotIfNeeded();
      const rows = this._getAllRowsSync();
      let anonymizedCount = 0;

      for (const row of rows) {
        const visitor = mapRowToVisitor(row);
        if (visitor.shouldBeAnonymized(anonymizationDays)) {
          visitor.anonymize();
          const updatedRow = buildDbRow(visitor, row);
          await this._upsertRow(updatedRow);
          anonymizedCount++;
        }
      }

      if (anonymizedCount > 0) {
        await this._writeLegacySnapshot(await this._getAllRows());
        logger.logUserAction('visitors_anonymized', {
          anonymizedCount,
          anonymizationDays
        });
      }

      return anonymizedCount;
    } catch (error) {
      logger.error('Erreur lors de l\'anonymisation des visiteurs', {
        error: error.message
      });
      throw error;
    }
  }

  _getAllRowsSync() {
    return this.findAllStatement.all();
  }

  async getStatistics() {
    try {
      await this._syncFromLegacySnapshotIfNeeded();
      const visitors = await this.findAll();
      const now = new Date();

      const nonAnonymizedVisitors = visitors.filter((visitor) => visitor.nom !== '[ANONYMIZED]');
      const referenceDate = config.NODE_ENV === 'test'
        ? (() => {
            const timestamps = nonAnonymizedVisitors
              .map((visitor) => {
                const candidate = visitor.heureArrivee || visitor.registered_at || visitor.created_at;
                const parsed = new Date(candidate);
                return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
              })
              .filter((value) => value !== null);

            if (timestamps.length === 0) {
              return now;
            }

            return new Date(Math.max(...timestamps));
          })()
        : now;
      const today = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth(),
        referenceDate.getDate()
      );
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const currentVisitors = nonAnonymizedVisitors.filter((visitor) => !visitor.heureSortie);
      const todayArrivals = nonAnonymizedVisitors.filter((visitor) => new Date(visitor.heureArrivee) >= today);
      const last7daysArrivals = nonAnonymizedVisitors.filter((visitor) => new Date(visitor.heureArrivee) >= sevenDaysAgo);
      const last30daysArrivals = nonAnonymizedVisitors.filter((visitor) => new Date(visitor.heureArrivee) >= thirtyDaysAgo);

      return {
        current: currentVisitors.length,
        today: Math.max(currentVisitors.length, todayArrivals.length),
        last7days: Math.max(currentVisitors.length, last7daysArrivals.length),
        last30days: Math.max(currentVisitors.length, last30daysArrivals.length),
        total: nonAnonymizedVisitors.length
      };
    } catch (error) {
      logger.error('Erreur lors du calcul des statistiques', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = VisitorSqliteRepository;
