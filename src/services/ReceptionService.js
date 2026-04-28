const VisitorRepository = require('../repositories/VisitorRepository');
const SettingsRepository = require('../repositories/SettingsRepository');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { normalizeDateOnly } = require('../utils/registerNo');

function toReceptionView(registration) {
  if (!registration) {
    return null;
  }

  return {
    id: registration.id,
    registerNo: registration.registerNo || registration.register_no,
    visitorName: registration.visitorName || registration.visitor_name,
    company: registration.company,
    hostName: registration.hostName || registration.host_name,
    visitPurpose: registration.visitPurpose || registration.visit_purpose,
    scheduledDate: registration.scheduledDate || registration.scheduled_date,
    registeredAt: registration.registeredAt || registration.registered_at,
    checkedInAt: registration.checkedInAt || registration.checked_in_at || null,
    checkedOutAt: registration.checkedOutAt || registration.checked_out_at || null,
    status: registration.status,
    source: registration.source
  };
}

function sanitizeReceptionSnapshot(snapshot = {}) {
  return {
    date: snapshot.date,
    pending: Array.isArray(snapshot.pending) ? snapshot.pending.map(toReceptionView) : [],
    checkedIn: Array.isArray(snapshot.checkedIn) ? snapshot.checkedIn.map(toReceptionView) : [],
    future: Array.isArray(snapshot.future) ? snapshot.future.map(toReceptionView) : [],
    counts: snapshot.counts || {
      pending: 0,
      checkedIn: 0,
      future: 0,
      total: 0
    }
  };
}

function toNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isPinLike(value) {
  return /^\d{4,6}$/.test(String(value || '').trim());
}

function isRegisterNoLike(value) {
  return /^V\d{8}-\d{4}$/i.test(String(value || '').trim());
}

class ReceptionService {
  constructor(options = {}) {
    this.visitorRepository = options.visitorRepository || new VisitorRepository();
    this.settingsRepository = options.settingsRepository || new SettingsRepository();
  }

  _normalizeIdentifier(input) {
    return toNullableString(input);
  }

  _normalizeQrToken(input) {
    return toNullableString(input);
  }

  async _findRegistrationByPinOrRegisterNo(identifier) {
    const normalized = this._normalizeIdentifier(identifier);
    if (!normalized) {
      throw new AppError('PIN ou numero de visiteur requis', 400);
    }

    const pinLike = isPinLike(normalized);
    const registerNoLike = isRegisterNoLike(normalized);

    if (pinLike) {
      const byPin = await this.visitorRepository.findByPinCode(normalized);
      if (byPin) {
        return {
          registration: byPin,
          lookupType: 'pin'
        };
      }
    }

    if (registerNoLike || !pinLike) {
      const byRegisterNo = await this.visitorRepository.findByRegisterNo(normalized);
      if (byRegisterNo) {
        return {
          registration: byRegisterNo,
          lookupType: 'registerNo'
        };
      }
    }

    if (!pinLike && !registerNoLike) {
      const byPin = await this.visitorRepository.findByPinCode(normalized);
      if (byPin) {
        return {
          registration: byPin,
          lookupType: 'pin'
        };
      }
    }

    throw new AppError('Registration not found', 404);
  }

  async getTodayDashboard(date = new Date()) {
    try {
      const dashboard = await this.visitorRepository.getReceptionSnapshot(date);
      const sanitizedDashboard = sanitizeReceptionSnapshot(dashboard);

      logger.info('Reception dashboard loaded', {
        date: sanitizedDashboard.date,
        counts: sanitizedDashboard.counts
      });

      return sanitizedDashboard;
    } catch (error) {
      logger.error('Failed to load reception dashboard', {
        error: error.message,
        date
      });
      throw error;
    }
  }

  async checkInByPin(payload = {}) {
    try {
      const enablePinCheckin = await this.settingsRepository.getBoolean('enable_pin_checkin', true);
      if (!enablePinCheckin) {
        throw new AppError('PIN check-in disabled', 403);
      }

      const identifier = this._normalizeIdentifier(
        payload.identifier || payload.pin || payload.registerNo || payload.value
      );
      const lookup = await this._findRegistrationByPinOrRegisterNo(identifier);

      const result = await this.visitorRepository.markRegistrationCheckedIn(lookup.registration.id);

      logger.info('Reception check-in completed', {
        registerNo: result.registration.registerNo,
        lookupType: lookup.lookupType,
        alreadyCheckedIn: result.alreadyCheckedIn
      });

      return {
        registration: toReceptionView(result.registration),
        alreadyCheckedIn: result.alreadyCheckedIn,
        lookupType: lookup.lookupType,
        message: result.alreadyCheckedIn
          ? 'Le visiteur est deja enregistre comme present'
          : 'Visiteur enregistre avec succes'
      };
    } catch (error) {
      logger.error('Failed to check in by pin or register number', {
        error: error.message,
        payload
      });
      throw error;
    }
  }

  async checkInByQr(payload = {}) {
    try {
      const enableQrCheckin = await this.settingsRepository.getBoolean('enable_qr_checkin', true);
      if (!enableQrCheckin) {
        throw new AppError('QR check-in disabled', 403);
      }

      const qrToken = this._normalizeQrToken(
        payload.qrToken || payload.qrContent || payload.token || payload.value
      );

      if (!qrToken) {
        throw new AppError('QR token requis', 400);
      }

      const registration = await this.visitorRepository.findByQrToken(qrToken);
      if (!registration) {
        throw new AppError('Registration not found', 404);
      }

      const result = await this.visitorRepository.markRegistrationCheckedIn(registration.id);

      logger.info('Reception QR check-in completed', {
        registerNo: result.registration.registerNo,
        alreadyCheckedIn: result.alreadyCheckedIn
      });

      return {
        registration: toReceptionView(result.registration),
        alreadyCheckedIn: result.alreadyCheckedIn,
        lookupType: 'qr',
        message: result.alreadyCheckedIn
          ? 'Le visiteur est deja enregistre comme present'
          : 'Visiteur enregistre avec succes'
      };
    } catch (error) {
      logger.error('Failed to check in by QR', {
        error: error.message,
        payload
      });
      throw error;
    }
  }

  async checkOutById(id) {
    try {
      const normalizedId = this._normalizeIdentifier(id);
      if (!normalizedId) {
        throw new AppError('Visitor id requis', 400);
      }

      const result = await this.visitorRepository.markRegistrationCheckedOut(normalizedId);

      logger.info('Reception checkout completed', {
        registerNo: result.registration.registerNo,
        alreadyCheckedOut: result.alreadyCheckedOut
      });

      return {
        registration: toReceptionView(result.registration),
        alreadyCheckedOut: result.alreadyCheckedOut,
        message: result.alreadyCheckedOut
          ? 'Le visiteur est deja enregistre comme parti'
          : 'Visiteur sorti avec succes'
      };
    } catch (error) {
      logger.error('Failed to checkout by id', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  async findRegistrationById(id) {
    try {
      const normalizedId = this._normalizeIdentifier(id);
      if (!normalizedId) {
        throw new AppError('Visitor id requis', 400);
      }

      const registration = await this.visitorRepository.findRegistrationById(normalizedId);
      if (!registration) {
        throw new AppError('Registration not found', 404);
      }

      return registration;
    } catch (error) {
      logger.error('Failed to load registration by id', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  normalizeDate(dateValue) {
    return normalizeDateOnly(dateValue) || new Date().toISOString().slice(0, 10);
  }
}

module.exports = ReceptionService;
