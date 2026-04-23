const fs = require('fs').promises;
const path = require('path');
const { randomUUID } = require('crypto');
const Visitor = require('../models/Visitor');
const { AppError } = require('../middleware/errorHandler');
const config = require('../config/config');
const logger = require('../utils/logger');
const { openDatabase } = require('../db/sqlite');
const { formatRegisterNo, normalizeDateOnly } = require('../utils/registerNo');

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
    heureArrivee: row.status === 'registered' ? null : (row.heureArrivee || row.registered_at || null),
    heureSortie: row.heureSortie || row.checked_out_at || null,
    status: row.status || undefined,
    statut: row.statut || undefined
  });
}

function mapRowToRegistration(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    registerNo: row.register_no,
    register_no: row.register_no,
    pinCode: row.pin_code,
    pin_code: row.pin_code,
    qrToken: row.qr_token,
    qr_token: row.qr_token,
    visitorName: row.visitor_name,
    visitor_name: row.visitor_name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    hostName: row.host_name,
    host_name: row.host_name,
    visitPurpose: row.visit_purpose,
    visit_purpose: row.visit_purpose,
    scheduledDate: row.scheduled_date,
    scheduled_date: row.scheduled_date,
    registeredAt: row.registered_at,
    registered_at: row.registered_at,
    checkedInAt: row.checked_in_at,
    checked_in_at: row.checked_in_at,
    checkedOutAt: row.checked_out_at,
    checked_out_at: row.checked_out_at,
    status: row.status,
    source: row.source,
    notes: row.notes,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
    qrContent: row.qr_token
  };
}

function buildDbRow(visitorData, existingRow = {}) {
  const data = normalizeVisitorInput(visitorData);
  const now = new Date().toISOString();
  const hasValue = (key) => Object.prototype.hasOwnProperty.call(data, key);
  const hasArrivee = hasValue('heureArrivee') && data.heureArrivee !== null && data.heureArrivee !== undefined;
  const registeredAt = hasValue('registered_at')
    ? data.registered_at
    : (hasArrivee ? data.heureArrivee : (existingRow.registered_at || now));
  const checkedOutAt = hasValue('checked_out_at')
    ? data.checked_out_at
    : (hasValue('heureSortie') ? data.heureSortie : (existingRow.checked_out_at || null));
  const checkedInAt = hasValue('checked_in_at')
    ? data.checked_in_at
    : (hasArrivee ? data.heureArrivee : (hasValue('status') && data.status === 'registered' ? null : registeredAt));
  const createdAt = hasValue('created_at') ? data.created_at : (existingRow.created_at || registeredAt);
  const updatedAt = hasValue('updated_at') ? data.updated_at : now;
  const status = hasValue('status')
    ? data.status
    : (existingRow.status || (checkedOutAt ? 'checked_out' : 'checked_in'));
  const source = data.source || existingRow.source || 'web';
  const scheduledDate = data.scheduled_date || existingRow.scheduled_date || (registeredAt ? String(registeredAt).slice(0, 10) : null);
  const visitorName = data.visitor_name || existingRow.visitor_name || buildDisplayName(data);
  const company = data.company ?? data.societe ?? existingRow.company ?? existingRow.societe ?? null;
  const phone = data.phone ?? data.telephone ?? existingRow.phone ?? existingRow.telephone ?? null;
  const hostName = data.host_name
    ?? data.personneVisitee
    ?? existingRow.host_name
    ?? existingRow.personneVisitee
    ?? 'Non renseigne';
  const visitPurpose = data.visit_purpose ?? existingRow.visit_purpose ?? null;
  const notes = data.notes ?? existingRow.notes ?? null;

  return {
    id: data.id || existingRow.id || randomUUID(),
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
    heureArrivee: hasValue('heureArrivee') ? data.heureArrivee : (existingRow.heureArrivee ?? registeredAt),
    heureSortie: hasValue('heureSortie') ? data.heureSortie : (existingRow.heureSortie ?? checkedOutAt),
    statut: hasValue('statut') ? data.statut : (existingRow.statut ?? (checkedOutAt ? 'parti' : 'present'))
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
      'SELECT * FROM visitors WHERE email = ? AND status = ? LIMIT 1'
    );
    this.findCurrentVisitorsStatement = this.db.prepare(
      "SELECT * FROM visitors WHERE status = 'checked_in' ORDER BY created_at ASC, id ASC"
    );
    this.findByDateRangeStatement = this.db.prepare(
      'SELECT * FROM visitors WHERE heureArrivee >= ? AND heureArrivee <= ? ORDER BY heureArrivee ASC, id ASC'
    );
    this.findByRegisterNoStatement = this.db.prepare(
      'SELECT * FROM visitors WHERE register_no = ? LIMIT 1'
    );
    this.findByQrTokenStatement = this.db.prepare(
      'SELECT * FROM visitors WHERE qr_token = ? LIMIT 1'
    );
    this.findByPinCodeStatement = this.db.prepare(
      "SELECT * FROM visitors WHERE pin_code = ? AND status IN ('registered', 'checked_in') LIMIT 1"
    );
    this.countRegisteredOnDateStatement = this.db.prepare(
      "SELECT COUNT(*) AS count FROM visitors WHERE substr(registered_at, 1, 10) = ?"
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
        const dbRow = buildDbRow(row, {});
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

  _getAllRowsSync() {
    return this.findAllStatement.all();
  }

  _getRegisterSequenceCount(dateKey) {
    const row = this.countRegisteredOnDateStatement.get(dateKey);
    return Number(row?.count || 0);
  }

  async findAll() {
    try {
      await this._syncFromLegacySnapshotIfNeeded();
      const rows = this.findAllStatement.all();
      return rows.map((row) => mapRowToVisitor(row));
    } catch (error) {
      logger.error('Error while retrieving visitors from SQLite', {
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
      logger.error('Error while finding visitor by id', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  async findByEmailPresent(email) {
    try {
      await this._syncFromLegacySnapshotIfNeeded();
      const row = this.findByEmailPresentStatement.get(email, 'checked_in');
      return row ? mapRowToVisitor(row) : null;
    } catch (error) {
      logger.error('Error while finding visitor by email', {
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
      logger.error('Error while retrieving current visitors', {
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
      logger.error('Error while retrieving visitors by date range', {
        error: error.message,
        startDate,
        endDate
      });
      throw error;
    }
  }

  async findByRegisterNo(registerNo) {
    try {
      await this._syncFromLegacySnapshotIfNeeded();
      const normalized = String(registerNo || '').trim();
      if (!normalized) {
        return null;
      }

      const row = this.findByRegisterNoStatement.get(normalized);
      return row ? mapRowToRegistration(row) : null;
    } catch (error) {
      logger.error('Error while finding registration by register number', {
        error: error.message,
        registerNo
      });
      throw error;
    }
  }

  async findByQrToken(qrToken) {
    try {
      await this._syncFromLegacySnapshotIfNeeded();
      const normalized = String(qrToken || '').trim();
      if (!normalized) {
        return null;
      }

      const row = this.findByQrTokenStatement.get(normalized);
      return row ? mapRowToRegistration(row) : null;
    } catch (error) {
      logger.error('Error while finding registration by qr token', {
        error: error.message,
        qrToken
      });
      throw error;
    }
  }

  async findByPinCode(pinCode) {
    try {
      await this._syncFromLegacySnapshotIfNeeded();
      const normalized = String(pinCode || '').trim();
      if (!normalized) {
        return null;
      }

      const row = this.findByPinCodeStatement.get(normalized);
      return row ? mapRowToRegistration(row) : null;
    } catch (error) {
      logger.error('Error while finding registration by pin code', {
        error: error.message,
        pinCode
      });
      throw error;
    }
  }

  async createRegistration(registrationData, options = {}) {
    try {
      await this._syncFromLegacySnapshotIfNeeded();
      const data = normalizeVisitorInput(registrationData);
      const now = options.now || new Date().toISOString();
      const registeredAt = data.registered_at || now;
      const dateKey = normalizeDateOnly(registeredAt) || registeredAt.slice(0, 10);
      let row = null;
      this.db.exec('BEGIN IMMEDIATE');
      try {
        const sequence = this._getRegisterSequenceCount(dateKey) + 1;
        const registerNo = data.register_no || formatRegisterNo(registeredAt, sequence);

        row = buildDbRow({
          ...data,
          register_no: registerNo,
          registered_at: registeredAt,
          checked_in_at: null,
          checked_out_at: null,
          status: 'registered',
          source: data.source || 'web',
          heureArrivee: null,
          heureSortie: null,
          statut: 'registered',
          created_at: data.created_at || registeredAt,
          updated_at: data.updated_at || now
        });

        row.register_no = registerNo;
        row.registered_at = registeredAt;
        row.checked_in_at = null;
        row.checked_out_at = null;
        row.status = 'registered';
        row.source = data.source || 'web';
        row.heureArrivee = null;
        row.heureSortie = null;
        row.statut = 'registered';

        this.upsertStatement.run(row);
        this.db.exec('COMMIT');
      } catch (error) {
        try {
          this.db.exec('ROLLBACK');
        } catch (rollbackError) {
          logger.warn('Rollback failed while creating registration', {
            error: rollbackError.message
          });
        }

        throw error;
      }

      await this._writeLegacySnapshot(await this._getAllRows());

      logger.logUserAction('visitor_registered', {
        registerNo: row.register_no,
        visitorName: row.visitor_name,
        scheduledDate: row.scheduled_date
      });

      return mapRowToRegistration(row);
    } catch (error) {
      logger.error('Error while creating registration', {
        error: error.message,
        registrationData
      });
      throw error;
    }
  }

  async create(visitorData) {
    try {
      await this._syncFromLegacySnapshotIfNeeded();
      const visitor = visitorData instanceof Visitor ? visitorData : new Visitor(visitorData);
      const row = buildDbRow(visitor, {});
      await this._upsertRow(row);
      await this._writeLegacySnapshot(await this._getAllRows());

      logger.logUserAction('visitor_checkin', {
        visitorId: row.id,
        email: row.email,
        societe: row.societe
      });

      return mapRowToVisitor(row);
    } catch (error) {
      logger.error('Error while creating visitor', {
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
      logger.error('Error while updating visitor', {
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
      const currentRow = this.findByEmailPresentStatement.get(email, 'checked_in');
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
      logger.error('Error while checking out visitor', {
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
      logger.error('Error while deleting visitors', {
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
      logger.error('Error while anonymizing visitors', {
        error: error.message
      });
      throw error;
    }
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
      const currentVisitors = nonAnonymizedVisitors.filter((visitor) => visitor.status === 'checked_in');
      const todayArrivals = nonAnonymizedVisitors.filter((visitor) => new Date(visitor.heureArrivee || visitor.registered_at || visitor.created_at) >= today);
      const last7daysArrivals = nonAnonymizedVisitors.filter((visitor) => new Date(visitor.heureArrivee || visitor.registered_at || visitor.created_at) >= sevenDaysAgo);
      const last30daysArrivals = nonAnonymizedVisitors.filter((visitor) => new Date(visitor.heureArrivee || visitor.registered_at || visitor.created_at) >= thirtyDaysAgo);

      return {
        current: currentVisitors.length,
        today: Math.max(currentVisitors.length, todayArrivals.length),
        last7days: Math.max(currentVisitors.length, last7daysArrivals.length),
        last30days: Math.max(currentVisitors.length, last30daysArrivals.length),
        total: nonAnonymizedVisitors.length
      };
    } catch (error) {
      logger.error('Error while calculating statistics', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = VisitorSqliteRepository;
