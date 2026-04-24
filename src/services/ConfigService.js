const ConfigRepository = require('../repositories/ConfigRepository');
const SettingsRepository = require('../repositories/SettingsRepository');
const Config = require('../models/Config');
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

class ConfigService {
  constructor() {
    this.configRepository = new ConfigRepository();
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
      return await this.configRepository.getConfig();
    } catch (error) {
      logger.error('Erreur lors de la recuperation de la configuration complete', {
        error: error.message
      });
      throw error;
    }
  }

  async updateConfig(updates) {
    try {
      const updatedConfig = await this.configRepository.updateConfig(updates);

      logger.info('Configuration mise a jour avec succes', {
        updates: Object.keys(updates),
        timestamp: new Date().toISOString()
      });

      return updatedConfig.getPublicConfig();
    } catch (error) {
      logger.error('Erreur lors de la mise a jour de la configuration', {
        error: error.message,
        updates
      });
      throw error;
    }
  }

  async authenticatePin(pin) {
    try {
      if (!pin) {
        throw new AppError('Le code PIN est requis', 400);
      }

      const isValid = await this.configRepository.verifyPin(pin);

      if (!isValid) {
        throw new AppError('Code PIN incorrect', 401);
      }

      logger.info('Authentification PIN reussie', {
        timestamp: new Date().toISOString()
      });

      return { success: true, authenticated: true };
    } catch (error) {
      logger.warn('Echec de l\'authentification PIN', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async changePin(newPin, currentPin = null) {
    try {
      if (!newPin) {
        throw new AppError('Le nouveau code PIN est requis', 400);
      }

      const normalizedPin = this._normalizePin(newPin);
      this._validatePin(normalizedPin);

      const updatedConfig = await this.configRepository.changePin(normalizedPin, currentPin);

      logger.info('Code PIN change avec succes', {
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Code PIN mis a jour avec succes',
        requirePinChange: updatedConfig.requirePinChange
      };
    } catch (error) {
      logger.error('Erreur lors du changement de PIN', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  _normalizePin(pin) {
    if (pin === null || pin === undefined) {
      throw new AppError('Le code PIN ne peut pas etre vide', 400);
    }

    let normalized = String(pin).trim();
    normalized = normalized.replace(/\s/g, '');
    return normalized;
  }

  _validatePin(pin) {
    if (!pin || pin.length === 0) {
      throw new AppError('Le code PIN ne peut pas etre vide', 400);
    }

    if (pin.length < 4 || pin.length > 6) {
      throw new AppError('Le code PIN doit contenir entre 4 et 6 chiffres', 400);
    }

    if (!/^\d+$/.test(pin)) {
      throw new AppError('Le code PIN ne peut contenir que des chiffres', 400);
    }

    return true;
  }

  async updateLogo(logoPath) {
    try {
      if (!logoPath) {
        throw new AppError('Le chemin du logo est requis', 400);
      }

      const updatedConfig = await this.configRepository.updateLogoPath(logoPath);

      logger.info('Logo mis a jour avec succes', {
        logoPath,
        timestamp: new Date().toISOString()
      });

      return updatedConfig.getPublicConfig();
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
      const defaultConfig = await this.configRepository.resetToDefaults();

      logger.warn('Configuration reinitialisee aux valeurs par defaut', {
        timestamp: new Date().toISOString()
      });

      return defaultConfig.getPublicConfig();
    } catch (error) {
      logger.error('Erreur lors de la reinitialisation de la configuration', {
        error: error.message
      });
      throw error;
    }
  }

  validateConfigUpdate(updates) {
    const { error, value } = Config.validateConfig(updates);
    if (error) {
      throw new AppError(
        `Configuration invalide: ${error.details.map((d) => d.message).join(', ')}`,
        400
      );
    }

    return value;
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
