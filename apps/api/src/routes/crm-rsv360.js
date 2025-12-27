/**
 * 📊 Rotas RSV360 - CRM
 * FASE 1.4.3: Rotas de CRM para segmentação e campanhas
 */

const express = require("express");
const Joi = require("joi");
const router = express.Router();
const crmService = require("../services/crmService");
const { advancedJWTValidation, requireRole } = require("../middleware/advancedAuth");
const { publicRateLimiter } = require("../middleware/rateLimiter");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ service: 'crmRoutes' });
const authenticate = advancedJWTValidation;

// Aplicar rate limiting
router.use(publicRateLimiter);

// Schema de validação para criar segmento
const createSegmentSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  description: Joi.string().optional().max(500),
  criteria: Joi.object({
    min_bookings: Joi.number().integer().min(0).optional(),
    min_total_spent: Joi.number().min(0).optional(),
    last_booking_days: Joi.number().integer().min(0).optional(),
  }).optional(),
});

// Schema de validação para criar campanha
const createCampaignSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  description: Joi.string().optional().max(500),
  segment_id: Joi.number().integer().optional(),
  campaign_type: Joi.string().valid('email', 'sms', 'push', 'all').default('email'),
});

// Schema de validação para registrar interação
const recordInteractionSchema = Joi.object({
  customer_id: Joi.number().integer().required(),
  interaction_type: Joi.string().valid('email', 'sms', 'push', 'call', 'visit').required(),
  channel: Joi.string().optional(),
  content: Joi.string().optional(),
  metadata: Joi.object().optional(),
});

/**
 * GET /api/rsv360/crm/segments
 * Listar todos os segmentos
 */
router.get("/segments", authenticate, requireRole(['admin', 'marketing']), async (req, res) => {
  try {
    const { db } = require("../config/database");
    const segments = await db("crm_segments")
      .orderBy("created_at", "desc");

    res.json({
      success: true,
      segments: segments.map(segment => ({
        ...segment,
        criteria: segment.criteria ? JSON.parse(segment.criteria) : {},
      })),
      count: segments.length,
    });
  } catch (error) {
    logger.error('Erro ao listar segmentos', { error: error.message });
    res.status(500).json({
      error: "Erro ao listar segmentos",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/crm/segments
 * Criar novo segmento
 */
router.post("/segments", authenticate, requireRole(['admin', 'marketing']), async (req, res) => {
  try {
    const { error, value } = createSegmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const segment = await crmService.createSegment(value);

    res.status(201).json({
      success: true,
      segment: {
        ...segment,
        criteria: segment.criteria ? JSON.parse(segment.criteria) : {},
      },
    });
  } catch (error) {
    logger.error('Erro ao criar segmento', { error: error.message });
    res.status(500).json({
      error: "Erro ao criar segmento",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/crm/segments/:segmentId/customers
 * Obter clientes de um segmento
 */
router.get("/segments/:segmentId/customers", authenticate, requireRole(['admin', 'marketing']), async (req, res) => {
  try {
    const { segmentId } = req.params;
    const customers = await crmService.getSegmentCustomers(parseInt(segmentId));

    res.json({
      success: true,
      segment_id: parseInt(segmentId),
      customers,
      count: customers.length,
    });
  } catch (error) {
    logger.error('Erro ao obter clientes do segmento', { error: error.message });
    res.status(500).json({
      error: "Erro ao obter clientes do segmento",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/crm/campaigns
 * Listar todas as campanhas
 */
router.get("/campaigns", authenticate, requireRole(['admin', 'marketing']), async (req, res) => {
  try {
    const { db } = require("../config/database");
    const campaigns = await db("crm_campaigns")
      .orderBy("created_at", "desc");

    res.json({
      success: true,
      campaigns,
      count: campaigns.length,
    });
  } catch (error) {
    logger.error('Erro ao listar campanhas', { error: error.message });
    res.status(500).json({
      error: "Erro ao listar campanhas",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/crm/campaigns
 * Criar nova campanha
 */
router.post("/campaigns", authenticate, requireRole(['admin', 'marketing']), async (req, res) => {
  try {
    const { error, value } = createCampaignSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const campaign = await crmService.createCampaign(value);

    res.status(201).json({
      success: true,
      campaign,
    });
  } catch (error) {
    logger.error('Erro ao criar campanha', { error: error.message });
    res.status(500).json({
      error: "Erro ao criar campanha",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/crm/interactions/:userId
 * Obter histórico de interações de um cliente
 */
router.get("/interactions/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // Verificar se usuário pode acessar (próprio perfil ou admin)
    if (parseInt(userId) !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({
        error: "Acesso negado",
        message: "Você não tem permissão para acessar este histórico",
      });
    }

    const interactions = await crmService.getCustomerInteractions(parseInt(userId), limit);

    res.json({
      success: true,
      customer_id: parseInt(userId),
      interactions,
      count: interactions.length,
    });
  } catch (error) {
    logger.error('Erro ao obter interações', { error: error.message });
    res.status(500).json({
      error: "Erro ao obter interações",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/crm/interactions
 * Registrar nova interação
 */
router.post("/interactions", authenticate, requireRole(['admin', 'marketing']), async (req, res) => {
  try {
    const { error, value } = recordInteractionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const interaction = await crmService.recordInteraction(value);

    res.status(201).json({
      success: true,
      interaction: {
        ...interaction,
        metadata: interaction.metadata ? JSON.parse(interaction.metadata) : {},
      },
    });
  } catch (error) {
    logger.error('Erro ao registrar interação', { error: error.message });
    res.status(500).json({
      error: "Erro ao registrar interação",
      message: error.message,
    });
  }
});

module.exports = router;

