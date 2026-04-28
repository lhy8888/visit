const config = require('../config/config');
const VisitorRepository = require('../repositories/VisitorRepository');
const SettingsRepository = require('../repositories/SettingsRepository');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { DEFAULT_TIME_ZONE, normalizeDateOnly } = require('../utils/registerNo');

const DEFAULT_SITE_TITLE = 'Visitor Access';
const DEFAULT_WELCOME_MESSAGE = 'Pre-register before you arrive.';

function normalizeLogoPath(value) {
  if (!value) {
    return '/images/logo.svg';
  }

  const trimmed = String(value).trim();
  return trimmed === '/images/logo.png' ? '/images/logo.svg' : trimmed;
}

function toNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toBooleanSetting(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value || '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function toNumericSetting(value, fallback = null) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function buildWindowStart(referenceDate, offsetDays, timeZone) {
  const start = new Date(referenceDate.getTime() - offsetDays * 24 * 60 * 60 * 1000);
  return normalizeDateOnly(start, timeZone);
}

function extractArrivalDate(registration, timeZone) {
  const candidate =
    registration.checkedInAt ||
    registration.checked_in_at ||
    registration.heureArrivee ||
    registration.registeredAt ||
    registration.registered_at;

  return normalizeDateOnly(candidate, timeZone);
}

function isConfirmedArrival(registration) {
  return Boolean(
    registration.checkedInAt ||
    registration.checked_in_at ||
    registration.status === 'checked_in' ||
    registration.status === 'checked_out' ||
    registration.heureArrivee
  );
}

class DashboardService {
  constructor(options = {}) {
    this.visitorRepository = options.visitorRepository || new VisitorRepository();
    this.settingsRepository = options.settingsRepository || new SettingsRepository();
  }

  async getTodayDashboard(date = new Date()) {
    try {
      const dashboard = await this.visitorRepository.getReceptionSnapshot(date);

      logger.info('Admin dashboard loaded', {
        date: dashboard.date,
        counts: dashboard.counts
      });

      return dashboard;
    } catch (error) {
      logger.error('Failed to load admin dashboard', {
        error: error.message,
        date
      });
      throw error;
    }
  }

  async listVisitors(filters = {}) {
    try {
      const normalizedFilters = {
        scheduledDate: filters.scheduledDate || filters.date || null,
        scheduledFrom: filters.from || filters.scheduledFrom || null,
        scheduledTo: filters.to || filters.scheduledTo || null,
        status: filters.status || filters.statuses || null,
        keyword: filters.keyword || null,
        sort: filters.sort || null
      };

      const visitors = await this.visitorRepository.searchRegistrations(normalizedFilters);

      return {
        items: visitors,
        count: visitors.length,
        filters: normalizedFilters
      };
    } catch (error) {
      logger.error('Failed to list visitors for admin dashboard', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  async getSummaryStats(referenceDate = new Date()) {
    try {
      const resolvedReferenceDate = referenceDate instanceof Date
        ? referenceDate
        : new Date(referenceDate);
      const safeReferenceDate = Number.isNaN(resolvedReferenceDate.getTime())
        ? new Date()
        : resolvedReferenceDate;
      const timeZone = await this.settingsRepository.get('default_timezone', DEFAULT_TIME_ZONE);
      const visitors = await this.visitorRepository.searchRegistrations({
        sort: 'checkedInAtAsc'
      });

      const confirmedArrivals = visitors.filter((registration) => isConfirmedArrival(registration));
      const referenceKey = normalizeDateOnly(safeReferenceDate, timeZone) || new Date().toISOString().slice(0, 10);
      const weekStartKey = buildWindowStart(safeReferenceDate, 6, timeZone);
      const monthStartKey = buildWindowStart(safeReferenceDate, 29, timeZone);
      const yearStartKey = buildWindowStart(safeReferenceDate, 364, timeZone);

      const summary = confirmedArrivals.reduce((accumulator, registration) => {
        const arrivalDate = extractArrivalDate(registration, timeZone);
        if (!arrivalDate) {
          return accumulator;
        }

        if (arrivalDate === referenceKey) {
          accumulator.today += 1;
        }

        if (arrivalDate >= weekStartKey) {
          accumulator.week += 1;
        }

        if (arrivalDate >= monthStartKey) {
          accumulator.month += 1;
        }

        if (arrivalDate >= yearStartKey) {
          accumulator.year += 1;
        }

        accumulator.total += 1;
        return accumulator;
      }, {
        today: 0,
        week: 0,
        month: 0,
        year: 0,
        total: 0
      });

      const byStatus = visitors.reduce((accumulator, registration) => {
        const key = registration.status || 'unknown';
        accumulator[key] = (accumulator[key] || 0) + 1;
        return accumulator;
      }, {});

      return {
        referenceDate: referenceKey,
        timeZone,
        today: summary.today,
        week: summary.week,
        month: summary.month,
        year: summary.year,
        total: summary.total,
        confirmedArrivals: summary,
        counts: summary,
        byStatus
      };
    } catch (error) {
      logger.error('Failed to build admin summary stats', {
        error: error.message,
        referenceDate
      });
      throw error;
    }
  }

  async getSettings() {
    try {
      const rawSettings = await this.settingsRepository.getAll();
      return this._normalizeSettings(rawSettings);
    } catch (error) {
      logger.error('Failed to load admin settings', {
        error: error.message
      });
      throw error;
    }
  }

  async updateSettings(updates = {}) {
    try {
      const normalized = this._normalizeSettingsInput(updates);
      const entries = Object.entries(normalized);

      for (const [key, value] of entries) {
        await this.settingsRepository.set(key, value);
      }

      logger.logAdminAccess('settings_updated', true, {
        keys: entries.map(([key]) => key)
      });

      return this.getSettings();
    } catch (error) {
      logger.logAdminAccess('settings_update_failed', false, {
        error: error.message
      });
      logger.error('Failed to update admin settings', {
        error: error.message,
        updates
      });
      throw error;
    }
  }

  async voidVisitor(id, updates = {}) {
    try {
      const normalizedId = toNullableString(id);
      if (!normalizedId) {
        throw new AppError('Visitor id requis', 400);
      }

      const registration = await this.visitorRepository.markRegistrationVoided(normalizedId, {
        reason: updates.reason || updates.notes || null
      });

      return registration;
    } catch (error) {
      logger.error('Failed to void visitor', {
        error: error.message,
        id,
        updates
      });
      throw error;
    }
  }

  _normalizeSettings(rawSettings = {}) {
    return {
      siteTitle: rawSettings.site_title || rawSettings.siteTitle || DEFAULT_SITE_TITLE,
      welcomeMessage: rawSettings.welcome_message || rawSettings.welcomeMessage || DEFAULT_WELCOME_MESSAGE,
      logoPath: normalizeLogoPath(rawSettings.logo_path || rawSettings.logoPath),
      defaultTimezone: rawSettings.default_timezone || rawSettings.defaultTimezone || DEFAULT_TIME_ZONE,
      pinLength: toNumericSetting(rawSettings.pin_length || rawSettings.pinLength, 6),
      dataRetentionDays: toNumericSetting(rawSettings.data_retention_days || rawSettings.dataRetentionDays, 365),
      enableQrCheckin: toBooleanSetting(rawSettings.enable_qr_checkin ?? rawSettings.enableQrCheckin ?? true),
      enablePinCheckin: toBooleanSetting(rawSettings.enable_pin_checkin ?? rawSettings.enablePinCheckin ?? true)
    };
  }

  _normalizeSettingsInput(updates = {}) {
    const normalized = {};
    const setIfPresent = (targetKey, ...sourceKeys) => {
      for (const sourceKey of sourceKeys) {
        if (Object.prototype.hasOwnProperty.call(updates, sourceKey)) {
          normalized[targetKey] = updates[sourceKey];
          return;
        }
      }
    };

    setIfPresent('site_title', 'site_title', 'siteTitle');
    setIfPresent('welcome_message', 'welcome_message', 'welcomeMessage');
    setIfPresent('logo_path', 'logo_path', 'logoPath');
    setIfPresent('default_timezone', 'default_timezone', 'defaultTimezone');
    setIfPresent('pin_length', 'pin_length', 'pinLength');
    setIfPresent('data_retention_days', 'data_retention_days', 'dataRetentionDays');
    setIfPresent('enable_qr_checkin', 'enable_qr_checkin', 'enableQrCheckin');
    setIfPresent('enable_pin_checkin', 'enable_pin_checkin', 'enablePinCheckin');

    if (Object.prototype.hasOwnProperty.call(normalized, 'pin_length')) {
      const pinLength = toNumericSetting(normalized.pin_length, null);
      if (!Number.isInteger(pinLength) || pinLength < 4 || pinLength > 6) {
        throw new AppError('Le nombre de chiffres du PIN doit être compris entre 4 et 6', 400);
      }
      normalized.pin_length = String(pinLength);
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'data_retention_days')) {
      const retention = toNumericSetting(normalized.data_retention_days, null);
      if (!Number.isInteger(retention) || retention < 1 || retention > 365) {
        throw new AppError('La période de rétention doit être comprise entre 1 et 365 jours', 400);
      }
      normalized.data_retention_days = String(retention);
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'enable_qr_checkin')) {
      normalized.enable_qr_checkin = normalized.enable_qr_checkin ? '1' : '0';
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'enable_pin_checkin')) {
      normalized.enable_pin_checkin = normalized.enable_pin_checkin ? '1' : '0';
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'site_title')) {
      normalized.site_title = String(normalized.site_title).trim();
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'welcome_message')) {
      normalized.welcome_message = String(normalized.welcome_message).trim();
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'logo_path')) {
      normalized.logo_path = normalizeLogoPath(normalized.logo_path);
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'default_timezone')) {
      normalized.default_timezone = String(normalized.default_timezone).trim() || DEFAULT_TIME_ZONE;
    }

    return normalized;
  }
}

module.exports = DashboardService;
