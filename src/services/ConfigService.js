const SettingsRepository = require('../repositories/SettingsRepository');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { DEFAULT_TIME_ZONE } = require('../utils/registerNo');

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
    siteTitle: rawSettings.site_title || rawSettings.siteTitle || 'Visitor Register',
    welcomeMessage: rawSettings.welcome_message || rawSettings.welcomeMessage || 'Bienvenue dans notre entreprise',
    logoPath: rawSettings.logo_path || rawSettings.logoPath || '/images/logo.png',
    defaultTimezone: rawSettings.default_timezone || rawSettings.defaultTimezone || DEFAULT_TIME_ZONE,
    pinLength: toNumericSetting(rawSettings.pin_length || rawSettings.pinLength, 6),
    dataRetentionDays: toNumericSetting(rawSettings.data_retention_days || rawSettings.dataRetentionDays, 30),
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
      logger.error('Erreur lors de la recuperation de la configuration publique', {
        error: error.message
      });
      throw error;
    }
  }

  async getWelcomeMessage() {
    try {
      const configSnapshot = normalizePublicSettings(await this.settingsRepository.getAll());
      return { message: configSnapshot.welcomeMessage || 'Bienvenue' };
    } catch (error) {
      logger.error('Erreur lors de la recuperation du message de bienvenue', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = ConfigService;
