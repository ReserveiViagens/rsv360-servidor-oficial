/**
 * 🔐 Smart Locks Routes
 * FASE 5.2: Rotas para integração com fechaduras inteligentes
 */

const express = require("express");
const Joi = require("joi");
const router = express.Router();
const smartLockService = require("../../services/smartLockService");
const { advancedJWTValidation, requireRole } = require("../../middleware/advancedAuth");
const { createLogger } = require("../../utils/logger");

const logger = createLogger({ service: 'smartLockRoutes' });
const authenticate = advancedJWTValidation;

// Schema para criar código de acesso
const createCodeSchema = Joi.object({
  lock_id: Joi.number().integer().required(),
  booking_id: Joi.number().integer().required(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().required(),
});

/**
 * POST /api/rsv360/integrations/smart-locks/codes
 * Criar código de acesso para uma reserva
 */
router.post("/codes", authenticate, async (req, res) => {
  try {
    const { error, value } = createCodeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: "Dados inválidos", details: error.details.map(d => d.message) });
    }

    const code = await smartLockService.createAccessCode(
      value.lock_id,
      value.booking_id,
      value.start_date,
      value.end_date
    );
    res.status(201).json(code);
  } catch (error) {
    logger.error('Erro ao criar código de acesso', { body: req.body, error: error.message });
    res.status(500).json({ error: error.message || "Erro interno do servidor" });
  }
});

/**
 * DELETE /api/rsv360/integrations/smart-locks/codes/:codeId
 * Revogar código de acesso
 */
router.delete("/codes/:codeId", authenticate, async (req, res) => {
  try {
    const { codeId } = req.params;
    const result = await smartLockService.revokeAccessCode(parseInt(codeId));
    res.json(result);
  } catch (error) {
    logger.error('Erro ao revogar código', { codeId: req.params.codeId, error: error.message });
    res.status(500).json({ error: error.message || "Erro interno do servidor" });
  }
});

/**
 * GET /api/rsv360/integrations/smart-locks/bookings/:bookingId/codes
 * Obter códigos de uma reserva
 */
router.get("/bookings/:bookingId/codes", authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const codes = await smartLockService.getBookingCodes(parseInt(bookingId));
    res.json(codes);
  } catch (error) {
    logger.error('Erro ao obter códigos da reserva', { bookingId: req.params.bookingId, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * GET /api/rsv360/integrations/smart-locks/:lockId/status
 * Verificar status de uma fechadura
 */
router.get("/:lockId/status", authenticate, async (req, res) => {
  try {
    const { lockId } = req.params;
    const status = await smartLockService.getLockStatus(parseInt(lockId));
    res.json(status);
  } catch (error) {
    logger.error('Erro ao verificar status da fechadura', { lockId: req.params.lockId, error: error.message });
    res.status(500).json({ error: error.message || "Erro interno do servidor" });
  }
});

module.exports = router;

