const RegistrationService = require('../services/RegistrationService');
const { asyncHandler } = require('../middleware/errorHandler');

class RegistrationController {
  constructor() {
    this.registrationService = new RegistrationService();
  }

  createRegistration = asyncHandler(async (req, res) => {
    const registration = await this.registrationService.createRegistration(req.body);
    const isReceptionCheckIn = registration.source === 'reception';

    res.status(201).json({
      success: true,
      message: isReceptionCheckIn
        ? 'Visitor checked in successfully'
        : 'Registration created successfully',
      data: registration
    });
  });

  getRegistrationByRegisterNo = asyncHandler(async (req, res) => {
    const registration = await this.registrationService.getRegistration(req.params.registerNo);

    res.status(200).json({
      success: true,
      data: registration
    });
  });
}

module.exports = RegistrationController;
