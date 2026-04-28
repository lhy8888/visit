const AuthService = require('../services/AuthService');
const DashboardService = require('../services/DashboardService');
const ExportService = require('../services/ExportService');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const {
  extractAdminSessionToken,
  getAdminSessionCookieName,
  getAdminSessionCookieOptions
} = require('../utils/adminAuth');

class AdminController {
  constructor(options = {}) {
    this.authService = options.authService || new AuthService();
    this.dashboardService = options.dashboardService || new DashboardService();
    this.exportService = options.exportService || new ExportService();
  }

  login = asyncHandler(async (req, res) => {
    const result = await this.authService.login(req.body || {});

    res.cookie(
      result.cookieName || getAdminSessionCookieName(),
      result.token || '',
      result.cookieOptions
    );

    res.status(200).json({
      success: true,
      message: 'Authentification r\u00e9ussie',
      data: {
        user: result.user,
        session: result.session
      },
      meta: {
        authMode: result.authMode || 'password'
      }
    });
  });

  logout = asyncHandler(async (req, res) => {
    const token = extractAdminSessionToken(req);
    await this.authService.logout(token);
    res.clearCookie(getAdminSessionCookieName(), getAdminSessionCookieOptions());

    res.status(200).json({
      success: true,
      message: 'D\u00e9connexion r\u00e9ussie'
    });
  });

  getSession = asyncHandler(async (req, res) => {
    const session = await this.authService.getSessionFromRequest(req);

    res.status(200).json({
      success: true,
      data: {
        authenticated: Boolean(session),
        session
      }
    });
  });

  getTodayDashboard = asyncHandler(async (req, res) => {
    const date = req.query.date || req.query.scheduledDate || new Date();
    const dashboard = await this.dashboardService.getTodayDashboard(date);

    res.status(200).json({
      success: true,
      data: dashboard
    });
  });

  listVisitors = asyncHandler(async (req, res) => {
    const result = await this.dashboardService.listVisitors(req.query || {});

    res.status(200).json({
      success: true,
      data: result.items,
      meta: {
        count: result.count,
        filters: result.filters
      }
    });
  });

  getSummaryStats = asyncHandler(async (req, res) => {
    const stats = await this.dashboardService.getSummaryStats(req.query.date || new Date());

    res.status(200).json({
      success: true,
      data: stats
    });
  });

  exportVisitors = asyncHandler(async (req, res) => {
    const result = await this.exportService.exportVisitors(req.query || {});

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    res.status(200).send(result.workbook);
  });

  voidVisitor = asyncHandler(async (req, res) => {
    const result = await this.dashboardService.voidVisitor(req.params.id, req.body || {});

    res.status(200).json({
      success: true,
      message: 'Visiteur marqu\u00e9 comme annul\u00e9',
      data: result.registration,
      meta: {
        alreadyVoided: result.alreadyVoided
      }
    });
  });

  getSettings = asyncHandler(async (req, res) => {
    const settings = await this.dashboardService.getSettings();

    res.status(200).json({
      success: true,
      data: settings
    });
  });

  updateSettings = asyncHandler(async (req, res) => {
    const settings = await this.dashboardService.updateSettings(req.body || {});

    res.status(200).json({
      success: true,
      message: 'Param\u00e8tres mis \u00e0 jour avec succ\u00e8s',
      data: settings
    });
  });

  uploadLogo = asyncHandler(async (req, res) => {
    if (!req.file) {
      if (req.logoUploadError) {
        throw new AppError(req.logoUploadError, 400);
      }

      throw new AppError('Logo file is required', 400);
    }

    const logoPath = `/images/${req.file.filename}`;
    const settings = await this.dashboardService.updateSettings({
      logoPath
    });

    res.status(200).json({
      success: true,
      message: 'Logo uploaded successfully',
      data: settings
    });
  });
}

module.exports = AdminController;
