const crypto = require('crypto');
const config = require('../config/config');
const VisitorRepository = require('../repositories/VisitorRepository');
const SettingsRepository = require('../repositories/SettingsRepository');
const Registration = require('../models/Registration');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { normalizeDateOnly } = require('../utils/registerNo');
const { generatePin, normalizePinLength } = require('../utils/pin');
const { buildQrContent, generateQrDataUrl } = require('../utils/qr');

const MAX_PRE_REGISTRATION_ADVANCE_DAYS = 90;

function toNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function combineVisitorName(data) {
  const directName = toNullableString(data.visitor_name || data.visitorName);
  if (directName) {
    return directName;
  }

  const firstName = toNullableString(data.prenom);
  const lastName = toNullableString(data.nom);
  const combined = [firstName, lastName].filter(Boolean).join(' ').trim();
  return combined || null;
}

class RegistrationService {
  constructor(options = {}) {
    this.visitorRepository = options.visitorRepository || new VisitorRepository();
    this.settingsRepository = options.settingsRepository || new SettingsRepository();
  }

  _normalizeInput(data = {}) {
    const source = data.source === 'reception' ? 'reception' : 'web';
    const receptionDate = source === 'reception' ? normalizeDateOnly(new Date()) : null;
    return {
      visitorName: combineVisitorName(data),
      company: toNullableString(data.company || data.societe),
      email: toNullableString(data.email),
      phone: toNullableString(data.phone || data.telephone),
      hostName: toNullableString(data.host_name || data.hostName || data.personneVisitee),
      visitPurpose: toNullableString(data.visit_purpose || data.visitPurpose),
      scheduledDate: normalizeDateOnly(
        receptionDate || data.scheduled_date || data.scheduledDate || data.date || null
      ),
      notes: toNullableString(data.notes),
      source
    };
  }

  async _getPinLength() {
    const pinLength = await this.settingsRepository.getNumber(
      'pin_length',
      config.VALIDATION.PIN_MAX_LENGTH
    );

    return normalizePinLength(pinLength, config.VALIDATION.PIN_MAX_LENGTH);
  }

  async _generateUniquePin(length) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = generatePin(length);
      const existing = await this.visitorRepository.findByPinCode(candidate);
      if (!existing) {
        return candidate;
      }
    }

    throw new AppError('Unable to generate a unique PIN', 500);
  }

  async _buildResponseModel(registration) {
    const qrContent = buildQrContent(registration.qrToken || registration.qr_token);
    const qrDataUrl = await generateQrDataUrl(qrContent);

    return {
      id: registration.id,
      registerNo: registration.registerNo || registration.register_no,
      pinCode: registration.pinCode || registration.pin_code,
      qrToken: registration.qrToken || registration.qr_token,
      qrContent,
      qrDataUrl,
      visitorName: registration.visitorName || registration.visitor_name,
      company: registration.company,
      email: registration.email,
      phone: registration.phone,
      hostName: registration.hostName || registration.host_name,
      visitPurpose: registration.visitPurpose || registration.visit_purpose,
      scheduledDate: registration.scheduledDate || registration.scheduled_date,
      registeredAt: registration.registeredAt || registration.registered_at,
      checkedInAt: registration.checkedInAt || registration.checked_in_at || null,
      checkedOutAt: registration.checkedOutAt || registration.checked_out_at || null,
      status: registration.status,
      source: registration.source,
      notes: registration.notes || null,
      createdAt: registration.createdAt || registration.created_at,
      updatedAt: registration.updatedAt || registration.updated_at,
      resultUrl: `/result/${encodeURIComponent(registration.registerNo || registration.register_no)}`
    };
  }

  async createRegistration(input, options = {}) {
    try {
      const normalized = this._normalizeInput(input);
      const { error, value } = Registration.validateRegistration(normalized);

      if (error) {
        throw new AppError(
          `Invalid registration data: ${error.details.map((detail) => detail.message).join(', ')}`,
          400
        );
      }

      const todayKey = normalizeDateOnly(new Date());
      const maxDateKey = normalizeDateOnly(
        new Date(Date.now() + MAX_PRE_REGISTRATION_ADVANCE_DAYS * 24 * 60 * 60 * 1000)
      );
      if (value.scheduledDate < todayKey || value.scheduledDate > maxDateKey) {
        throw new AppError(
          `Scheduled date must be between today and the next ${MAX_PRE_REGISTRATION_ADVANCE_DAYS} days`,
          400
        );
      }

      if (value.source === 'reception' && !options.receptionSession) {
        throw new AppError('Reception session required', 401);
      }

      const pinLength = await this._getPinLength();
      const pinCode = await this._generateUniquePin(pinLength);
      const qrToken = crypto.randomBytes(16).toString('hex');

      const created = await this.visitorRepository.createRegistration({
        visitor_name: value.visitorName,
        company: value.company,
        email: value.email,
        phone: value.phone,
        host_name: value.hostName,
        visit_purpose: value.visitPurpose,
        scheduled_date: value.scheduledDate,
        notes: value.notes,
        source: value.source,
        pin_code: pinCode,
        qr_token: qrToken
      });

      logger.info('Visitor pre-registration created', {
        registerNo: created.registerNo,
        visitorName: created.visitorName,
        scheduledDate: created.scheduledDate
      });

      return this._buildResponseModel(created);
    } catch (error) {
      logger.error('Failed to create registration', {
        error: error.message,
        input
      });
      throw error;
    }
  }

  async getRegistration(registerNo) {
    try {
      const normalizedRegisterNo = toNullableString(registerNo);
      if (!normalizedRegisterNo) {
        throw new AppError('Register number is required', 400);
      }

      const registration = await this.visitorRepository.findByRegisterNo(normalizedRegisterNo);
      if (!registration) {
        throw new AppError('Registration not found', 404);
      }

      return this._buildResponseModel(registration);
    } catch (error) {
      logger.error('Failed to load registration', {
        error: error.message,
        registerNo
      });
      throw error;
    }
  }
}

module.exports = RegistrationService;
