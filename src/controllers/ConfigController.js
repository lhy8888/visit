const ConfigService = require('../services/ConfigService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Controller pour la gestion de la configuration publique
 */
class ConfigController {
  constructor() {
    this.configService = new ConfigService();
  }

  /**
   * Obtenir la configuration publique
   * GET /api/config/public
   */
  getPublicConfig = asyncHandler(async (req, res) => {
    const config = await this.configService.getPublicConfig();

    res.status(200).json({
      success: true,
      data: config
    });
  });

  /**
   * Obtenir le message de bienvenue
   * GET /api/config/welcome-message
   */
  getWelcomeMessage = asyncHandler(async (req, res) => {
    const result = await this.configService.getWelcomeMessage();

    res.status(200).json({
      success: true,
      data: result
    });
  });
}

module.exports = ConfigController;
