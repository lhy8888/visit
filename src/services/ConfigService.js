const SettingsRepository = require('../repositories/SettingsRepository');
const config = require('../config/config');
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

function normalizeSettingsInput(updates = {}) {
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
      throw new AppError('Le nombre de chiffres du PIN doit etre compris entre 4 et 6', 400);
    }
    normalized.pin_length = String(pinLength);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'data_retention_days')) {
    const retention = toNumericSetting(normalized.data_retention_days, null);
    if (!Number.isInteger(retention) || retention < 1 || retention > 365) {
      throw new AppError('La periode de retention doit etre comprise entre 1 et 365 jours', 400);
    }
    normalized.data_retention_days = String(retention);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'enable_qr_checkin')) {
    normalized.enable_qr_checkin = toBooleanSetting(normalized.enable_qr_checkin) ? '1' : '0';
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'enable_pin_checkin')) {
    normalized.enable_pin_checkin = toBooleanSetting(normalized.enable_pin_checkin) ? '1' : '0';
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'site_title')) {
    normalized.site_title = String(normalized.site_title).trim();
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'welcome_message')) {
    normalized.welcome_message = String(normalized.welcome_message).trim();
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'logo_path')) {
    normalized.logo_path = String(normalized.logo_path).trim();
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'default_timezone')) {
    normalized.default_timezone = String(normalized.default_timezone).trim() || DEFAULT_TIME_ZONE;
  }

  return normalized;
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

  async getFullConfig() {
    try {
      const [publicConfig, securitySettings] = await Promise.all([
        this.getPublicConfig(),
        this.getSecuritySettings()
      ]);

      return {
        ...publicConfig,
        ...securitySettings
      };
    } catch (error) {
      logger.error('Erreur lors de la recuperation de la configuration complete', {
        error: error.message
      });
      throw error;
    }
  }

  async updateConfig(updates) {
    try {
      const normalizedUpdates = normalizeSettingsInput(updates);
      const entries = Object.entries(normalizedUpdates);

      for (const [key, value] of entries) {
        await this.settingsRepository.set(key, value);
      }

      logger.info('Configuration mise a jour avec succes', {
        updates: Object.keys(normalizedUpdates),
        timestamp: new Date().toISOString()
      });

      return this.getFullConfig();
    } catch (error) {
      logger.error('Erreur lors de la mise a jour de la configuration', {
        error: error.message,
        updates
      });
      throw error;
    }
  }

  async authenticatePin() {
    throw new AppError('Legacy PIN-only admin login has been removed. Use username and password.', 410);
  }

  async changePin() {
    throw new AppError('Legacy PIN configuration has been removed. Use /api/admin/settings.', 410);
  }

  async updateLogo(logoPath) {
    try {
      if (!logoPath) {
        throw new AppError('Le chemin du logo est requis', 400);
      }

      await this.settingsRepository.set('logo_path', logoPath);

      logger.info('Logo mis a jour avec succes', {
        logoPath,
        timestamp: new Date().toISOString()
      });

      return this.getPublicConfig();
    } catch (error) {
      logger.error('Erreur lors de la mise a jour du logo', {
        error: error.message,
        logoPath
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

  async resetConfig() {
    try {
      await this.settingsRepository.resetToDefaults();

      logger.warn('Configuration reinitialisee aux valeurs par defaut', {
        timestamp: new Date().toISOString()
      });

      return this.getFullConfig();
    } catch (error) {
      logger.error('Erreur lors de la reinitialisation de la configuration', {
        error: error.message
      });
      throw error;
    }
  }

  async getSecuritySettings() {
    try {
      const configSnapshot = normalizePublicSettings(await this.settingsRepository.getAll());

      return {
        requirePinChange: false,
        anonymizationDays: configSnapshot.dataRetentionDays,
        maxFileSize: config.MAX_FILE_SIZE,
        pinLength: configSnapshot.pinLength,
        enableQrCheckin: configSnapshot.enableQrCheckin,
        enablePinCheckin: configSnapshot.enablePinCheckin
      };
    } catch (error) {
      logger.error('Erreur lors de la recuperation des parametres de securite', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = ConfigService;
