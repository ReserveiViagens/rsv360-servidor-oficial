/**
 * 💰 Rotas RSV360 - Smart Pricing
 * FASE 1.4.1: Rotas de Smart Pricing API
 */

const express = require("express");
const Joi = require("joi");
const router = express.Router();
const smartPricingService = require("../services/smartPricingService");
const { advancedJWTValidation, requireRole } = require("../middleware/advancedAuth");
const { propertiesRateLimiter } = require("../middleware/rateLimiter");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ service: 'pricingRoutes' });
const authenticate = advancedJWTValidation;

// Aplicar rate limiting
router.use(propertiesRateLimiter);

// Schema de validação para cálculo de preço
const calculatePriceSchema = Joi.object({
  property_id: Joi.number().integer().required(),
  check_in: Joi.date().iso().required(),
  check_out: Joi.date().iso().required(),
  options: Joi.object().optional(),
});

// Schema de validação para histórico
const historySchema = Joi.object({
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().required(),
});

/**
 * GET /api/rsv360/pricing/config/:propertyId
 * Obter configuração de pricing de uma propriedade
 */
router.get("/config/:propertyId", authenticate, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const config = await smartPricingService.getPricingConfig(parseInt(propertyId));

    if (!config) {
      return res.status(404).json({
        error: "Configuração de pricing não encontrada",
        message: "Smart Pricing não está configurado para esta propriedade",
      });
    }

    res.json({
      success: true,
      config: {
        id: config.id,
        property_id: config.property_id,
        base_price: config.base_price,
        min_price: config.min_price,
        max_price: config.max_price,
        is_active: config.is_active,
        enable_competitor_analysis: config.enable_competitor_analysis,
        enable_weather_factor: config.enable_weather_factor,
        enable_events_factor: config.enable_events_factor,
        created_at: config.created_at,
        updated_at: config.updated_at,
      },
    });
  } catch (error) {
    logger.error('Erro ao obter configuração de pricing', { error: error.message });
    res.status(500).json({
      error: "Erro ao obter configuração de pricing",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/pricing/calculate
 * Calcular preço inteligente
 */
router.post("/calculate", authenticate, async (req, res) => {
  try {
    const { error, value } = calculatePriceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const { property_id, check_in, check_out, options } = value;

    const result = await smartPricingService.calculateSmartPrice(
      property_id,
      check_in,
      check_out,
      options || {}
    );

    res.json({
      success: true,
      pricing: result,
    });
  } catch (error) {
    logger.error('Erro ao calcular preço', { error: error.message });
    res.status(500).json({
      error: "Erro ao calcular preço inteligente",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/pricing/history/:propertyId
 * Obter histórico de preços de uma propriedade
 */
router.get("/history/:propertyId", authenticate, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { error, value } = historySchema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const { start_date, end_date } = value;

    const history = await smartPricingService.getPriceHistory(
      parseInt(propertyId),
      start_date,
      end_date
    );

    res.json({
      success: true,
      property_id: parseInt(propertyId),
      start_date,
      end_date,
      history,
      count: history.length,
    });
  } catch (error) {
    logger.error('Erro ao obter histórico de preços', { error: error.message });
    res.status(500).json({
      error: "Erro ao obter histórico de preços",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/pricing/competitors/:propertyId
 * Obter preços de competidores para uma propriedade
 */
router.get("/competitors/:propertyId", authenticate, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        error: "Data é obrigatória",
        message: "Forneça o parâmetro 'date' (YYYY-MM-DD)",
      });
    }

    const competitorPrices = await smartPricingService.getCompetitorPrices(
      parseInt(propertyId),
      date
    );

    if (!competitorPrices) {
      return res.status(404).json({
        error: "Preços de competidores não encontrados",
        message: "Não há dados de competidores para esta propriedade e data",
      });
    }

    res.json({
      success: true,
      property_id: parseInt(propertyId),
      date,
      competitor_prices: competitorPrices,
    });
  } catch (error) {
    logger.error('Erro ao obter preços de competidores', { error: error.message });
    res.status(500).json({
      error: "Erro ao obter preços de competidores",
      message: error.message,
    });
  }
});

module.exports = router;

