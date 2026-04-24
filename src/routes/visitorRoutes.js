const express = require('express');
const VisitorController = require('../controllers/VisitorController');
const { strictLimiter } = require('../middleware/security');
const { applyDeprecationHeaders } = require('../middleware/deprecation');

const router = express.Router();
const visitorController = new VisitorController();
const legacyVisitorRoute = applyDeprecationHeaders({
  message: 'Legacy visitor endpoints are deprecated. Use /api/registrations and /api/checkin/*.',
  replacement: '/api/registrations'
});

/**
 * Routes publiques pour les visiteurs
 */

// Enregistrer l'arrivee d'un visiteur
router.post('/check-in', legacyVisitorRoute, strictLimiter, visitorController.checkIn);

// Enregistrer le depart d'un visiteur
router.post('/check-out', legacyVisitorRoute, strictLimiter, visitorController.checkOut);

/**
 * Routes pour les statistiques publiques (si necessaire)
 */

// Obtenir les statistiques des visiteurs
router.get('/stats', legacyVisitorRoute, visitorController.getStatistics);

/**
 * Routes administratives pour la gestion des visiteurs
 */

// Obtenir tous les visiteurs
router.get('/', legacyVisitorRoute, visitorController.getAllVisitors);

// Obtenir les visiteurs actuellement presents
router.get('/current', legacyVisitorRoute, visitorController.getCurrentVisitors);

// Obtenir les visiteurs par periode
router.get('/range', legacyVisitorRoute, visitorController.getVisitorsByDateRange);

// Obtenir un visiteur par ID
router.get('/:id', legacyVisitorRoute, visitorController.getVisitorById);

// Obtenir un rapport de visite detaille
router.get('/:id/report', legacyVisitorRoute, visitorController.getVisitReport);

// Anonymiser les visiteurs anciens
router.post('/anonymize', legacyVisitorRoute, visitorController.anonymizeOldVisitors);

// Supprimer tous les visiteurs (fonction de debug)
router.delete('/clear', legacyVisitorRoute, visitorController.clearAllVisitors);

module.exports = router;
