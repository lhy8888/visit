const SettingsRepository = require('../repositories/SettingsRepository');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { DEFAULT_TIME_ZONE } = require('../utils/registerNo');

const DEFAULT_SITE_TITLE = 'Visitor Access';
const DEFAULT_WELCOME_MESSAGE = 'Pre-register before you arrive.';

function normalizeLogoPath(value) {
  if (!value) {
    return '/images/logo.svg';
  }

  const trimmed = String(value).trim();
  return trimmed === '/images/logo.png' ? '/images/logo.svg' : trimmed;
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

function normalizePublicSettings(rawSettings = {}) {
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

class ConfigService {
  constructor() {
    this.settingsRepository = new SettingsRepository();
  }

  async getPublicConfig() {
    try {
      const rawSettings = await this.settingsRepository.getAll();
      return normalizePublicSettings(rawSettings);
    } catch (error) {
      logger.error('Failed to load public configuration', {
        error: error.message
      });
      throw error;
    }
  }

  async getWelcomeMessage() {
    try {
      const configSnapshot = normalizePublicSettings(await this.settingsRepository.getAll());
      return { message: configSnapshot.welcomeMessage || DEFAULT_WELCOME_MESSAGE };
    } catch (error) {
      logger.error('Failed to load welcome message', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = ConfigService;
