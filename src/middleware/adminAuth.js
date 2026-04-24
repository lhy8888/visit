const AuthService = require('../services/AuthService');
const { AppError } = require('./errorHandler');

const authService = new AuthService();

async function requireAdminAuth(req, res, next) {
  try {
    const session = await authService.getSessionFromRequest(req);
    if (!session) {
      throw new AppError('Admin session required', 401);
    }

    req.adminSession = session;
    req.adminUser = session.user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requireAdminAuth
};
