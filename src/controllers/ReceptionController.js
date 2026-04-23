const ReceptionService = require('../services/ReceptionService');
const { asyncHandler } = require('../middleware/errorHandler');

class ReceptionController {
  constructor() {
    this.receptionService = new ReceptionService();
  }

  getTodayDashboard = asyncHandler(async (req, res) => {
    const date = req.query.date || req.query.scheduledDate || new Date();
    const dashboard = await this.receptionService.getTodayDashboard(date);

    res.status(200).json({
      success: true,
      data: dashboard
    });
  });

  checkInByPin = asyncHandler(async (req, res) => {
    const result = await this.receptionService.checkInByPin(req.body);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.registration,
      meta: {
        lookupType: result.lookupType,
        alreadyCheckedIn: result.alreadyCheckedIn
      }
    });
  });

  checkInByQr = asyncHandler(async (req, res) => {
    const result = await this.receptionService.checkInByQr(req.body);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.registration,
      meta: {
        lookupType: result.lookupType,
        alreadyCheckedIn: result.alreadyCheckedIn
      }
    });
  });

  checkoutVisitor = asyncHandler(async (req, res) => {
    const result = await this.receptionService.checkOutById(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.registration,
      meta: {
        alreadyCheckedOut: result.alreadyCheckedOut
      }
    });
  });
}

module.exports = ReceptionController;
