const Joi = require('joi');
const config = require('../config/config');

class Registration {
  static get registrationSchema() {
    return Joi.object({
      visitorName: Joi.string()
        .trim()
        .min(2)
        .max(120)
        .required(),

      company: Joi.string()
        .trim()
        .max(120)
        .allow('', null),

      email: Joi.string()
        .trim()
        .email()
        .allow('', null)
        .messages({
          'string.email': 'Email is not valid'
        }),

      phone: Joi.string()
        .trim()
        .max(32)
        .pattern(config.VALIDATION.PHONE_PATTERN)
        .allow('', null)
        .messages({
          'string.pattern.base': 'Phone number is not valid'
        }),

      hostName: Joi.string()
        .trim()
        .min(2)
        .max(120)
        .required(),

      visitPurpose: Joi.string()
        .trim()
        .max(255)
        .allow('', null),

      scheduledDate: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required()
        .messages({
          'string.pattern.base': 'Scheduled date must use YYYY-MM-DD'
        }),

      notes: Joi.string()
        .trim()
        .max(500)
        .allow('', null),

      source: Joi.string()
        .valid('web', 'reception')
        .default('web')
    });
  }

  static validateRegistration(data) {
    return this.registrationSchema.validate(data, { abortEarly: false });
  }
}

module.exports = Registration;
