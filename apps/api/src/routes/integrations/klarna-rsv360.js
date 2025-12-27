/**
 * 💳 Klarna Routes
 * FASE 5.3: Rotas para integração com Klarna (Reserve Now Pay Later)
 */

const express = require("express");
const Joi = require("joi");
const router = express.Router();
const klarnaService = require("../../services/klarnaService");
const { advancedJWTValidation } = require("../../middleware/advancedAuth");
const { createLogger } = require("../../utils/logger");

const logger = createLogger({ service: 'klarnaRoutes' });
const authenticate = advancedJWTValidation;

// Schema para criar sessão
const createSessionSchema = Joi.object({
  booking_id: Joi.number().integer().required(),
  customer_data: Joi.object({
    first_name: Joi.string().optional(),
    last_name: Joi.string().optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    address: Joi.string().optional(),
    city: Joi.string().optional(),
    postal_code: Joi.string().optional(),
  }).optional(),
});

// Schema para confirmar pagamento
const confirmPaymentSchema = Joi.object({
  session_id: Joi.string().required(),
  authorization_token: Joi.string().required(),
});

/**
 * GET /api/rsv360/integrations/klarna/eligibility/:bookingId
 * Verificar elegibilidade para Klarna
 */
router.get("/eligibility/:bookingId", authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { amount } = req.query;
    const eligibility = await klarnaService.checkEligibility(
      parseInt(bookingId),
      parseFloat(amount || 0)
    );
    res.json(eligibility);
  } catch (error) {
    logger.error('Erro ao verificar elegibilidade Klarna', { bookingId: req.params.bookingId, error: error.message });
    res.status(500).json({ error: error.message || "Erro interno do servidor" });
  }
});

/**
 * POST /api/rsv360/integrations/klarna/sessions
 * Criar sessão Klarna (Reserve Now Pay Later)
 */
router.post("/sessions", authenticate, async (req, res) => {
  try {
    const { error, value } = createSessionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: "Dados inválidos", details: error.details.map(d => d.message) });
    }

    const session = await klarnaService.createPayLaterSession(
      value.booking_id,
      value.customer_data || {}
    );
    res.status(201).json(session);
  } catch (error) {
    logger.error('Erro ao criar sessão Klarna', { body: req.body, error: error.message });
    res.status(500).json({ error: error.message || "Erro interno do servidor" });
  }
});

/**
 * POST /api/rsv360/integrations/klarna/confirm
 * Confirmar pagamento Klarna
 */
router.post("/confirm", authenticate, async (req, res) => {
  try {
    const { error, value } = confirmPaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: "Dados inválidos", details: error.details.map(d => d.message) });
    }

    const result = await klarnaService.confirmPayment(value.session_id, value.authorization_token);
    res.json(result);
  } catch (error) {
    logger.error('Erro ao confirmar pagamento Klarna', { body: req.body, error: error.message });
    res.status(500).json({ error: error.message || "Erro interno do servidor" });
  }
});

/**
 * GET /api/rsv360/integrations/klarna/sessions/:sessionId
 * Obter status de uma sessão Klarna
 */
router.get("/sessions/:sessionId", authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const status = await klarnaService.getSessionStatus(sessionId);
    res.json(status);
  } catch (error) {
    logger.error('Erro ao obter status da sessão', { sessionId: req.params.sessionId, error: error.message });
    res.status(500).json({ error: error.message || "Erro interno do servidor" });
  }
});

/**
 * POST /api/rsv360/integrations/klarna/webhook
 * Webhook Klarna (não requer autenticação JWT, mas deve validar assinatura)
 */
router.post("/webhook", async (req, res) => {
  try {
    // TODO: Validar assinatura do webhook Klarna
    const result = await klarnaService.processWebhook(req.body);
    res.json(result);
  } catch (error) {
    logger.error('Erro ao processar webhook Klarna', { body: req.body, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

module.exports = router;

