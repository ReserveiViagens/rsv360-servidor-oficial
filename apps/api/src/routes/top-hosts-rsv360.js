/**
 * 🏆 Rotas RSV360 - Top Hosts
 * FASE 1.4.2: Rotas de Top Host Program
 */

const express = require("express");
const Joi = require("joi");
const router = express.Router();
const topHostService = require("../services/topHostService");
const { advancedJWTValidation, requireRole } = require("../middleware/advancedAuth");
const { propertiesRateLimiter } = require("../middleware/rateLimiter");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ service: 'topHostsRoutes' });
const authenticate = advancedJWTValidation;

// Aplicar rate limiting
router.use(propertiesRateLimiter);

/**
 * GET /api/rsv360/top-hosts/leaderboard
 * Obter leaderboard de top hosts
 */
router.get("/leaderboard", authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        error: "Limite inválido",
        message: "O limite deve estar entre 1 e 100",
      });
    }

    const leaderboard = await topHostService.getTopHostsLeaderboard(limit);

    res.json({
      success: true,
      leaderboard,
      count: leaderboard.length,
      limit,
    });
  } catch (error) {
    logger.error('Erro ao obter leaderboard', { error: error.message });
    res.status(500).json({
      error: "Erro ao obter leaderboard",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/top-hosts/:hostId/rating
 * Obter rating completo de um host
 */
router.get("/:hostId/rating", authenticate, async (req, res) => {
  try {
    const { hostId } = req.params;
    const rating = await topHostService.calculateHostRating(parseInt(hostId));

    res.json({
      success: true,
      rating,
    });
  } catch (error) {
    logger.error('Erro ao obter rating do host', { error: error.message });
    res.status(500).json({
      error: "Erro ao obter rating do host",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/top-hosts/:hostId/badges
 * Obter badges de um host
 */
router.get("/:hostId/badges", authenticate, async (req, res) => {
  try {
    const { hostId } = req.params;
    const badges = await topHostService.getHostBadges(parseInt(hostId));

    res.json({
      success: true,
      host_id: parseInt(hostId),
      badges,
      count: badges.length,
    });
  } catch (error) {
    logger.error('Erro ao obter badges do host', { error: error.message });
    res.status(500).json({
      error: "Erro ao obter badges do host",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/top-hosts/:hostId/badges
 * Conceder badge a um host (apenas admin)
 */
router.post("/:hostId/badges", authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { hostId } = req.params;
    const { badge_type } = req.body;

    if (!badge_type) {
      return res.status(400).json({
        error: "Badge type é obrigatório",
        message: "Forneça o campo 'badge_type'",
      });
    }

    const validBadges = ['super_host', 'fast_responder', 'highly_rated', 'reliable'];
    if (!validBadges.includes(badge_type)) {
      return res.status(400).json({
        error: "Badge type inválido",
        message: `Badge type deve ser um dos: ${validBadges.join(', ')}`,
      });
    }

    await topHostService.grantBadge(parseInt(hostId), badge_type);

    res.json({
      success: true,
      message: `Badge '${badge_type}' concedido ao host ${hostId}`,
      host_id: parseInt(hostId),
      badge_type,
    });
  } catch (error) {
    logger.error('Erro ao conceder badge', { error: error.message });
    res.status(500).json({
      error: "Erro ao conceder badge",
      message: error.message,
    });
  }
});

module.exports = router;

