/**
 * 💰 Rotas RSV360 - Split Payments
 * FASE 2.1.8: Rotas de Group Travel - Divisão de Pagamentos
 */

const express = require("express");
const router = express.Router();
const splitPaymentService = require("../group-travel/services/split-payment-service");
const {
  createSplitPaymentSchema,
  markAsPaidSchema,
} = require("../group-travel/validators/split-payment-validator");
const { advancedJWTValidation } = require("../middleware/advancedAuth");
const { paymentsRateLimiter } = require("../middleware/rateLimiter");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ service: 'splitPaymentRoutes' });
const authenticate = advancedJWTValidation;

// Aplicar rate limiting
router.use(paymentsRateLimiter);

/**
 * POST /api/rsv360/split-payments
 * Criar split payment para uma reserva
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const { error, value } = createSplitPaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const { booking_id, splits } = value;
    const splitPayment = await splitPaymentService.createSplitPayment(booking_id, splits);

    res.status(201).json({
      success: true,
      split_payment: splitPayment,
    });
  } catch (error) {
    logger.error('Erro ao criar split payment', { error: error.message });
    res.status(500).json({
      error: "Erro ao criar split payment",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/split-payments/booking/:bookingId
 * Obter splits de uma reserva
 */
router.get("/booking/:bookingId", authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const splits = await splitPaymentService.getBookingSplits(parseInt(bookingId));
    const status = await splitPaymentService.getSplitStatus(parseInt(bookingId));

    res.json({
      success: true,
      booking_id: parseInt(bookingId),
      splits,
      status,
      count: splits.length,
    });
  } catch (error) {
    logger.error('Erro ao obter splits', { error: error.message });
    res.status(500).json({
      error: "Erro ao obter splits",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/split-payments/:splitId/mark-paid
 * Marcar split como pago
 */
router.post("/:splitId/mark-paid", authenticate, async (req, res) => {
  try {
    const { splitId } = req.params;
    const { error, value } = markAsPaidSchema.validate({
      ...req.body,
      split_id: parseInt(splitId),
    });

    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const { payment_method } = value;
    const split = await splitPaymentService.markAsPaid(parseInt(splitId), {
      method: payment_method,
    });

    res.json({
      success: true,
      split,
      message: "Split marcado como pago",
    });
  } catch (error) {
    logger.error('Erro ao marcar split como pago', { error: error.message });
    res.status(500).json({
      error: "Erro ao marcar split como pago",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/split-payments/booking/:bookingId/status
 * Obter status de splits de uma reserva
 */
router.get("/booking/:bookingId/status", authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const status = await splitPaymentService.getSplitStatus(parseInt(bookingId));

    res.json({
      success: true,
      status,
    });
  } catch (error) {
    logger.error('Erro ao obter status de splits', { error: error.message });
    res.status(500).json({
      error: "Erro ao obter status de splits",
      message: error.message,
    });
  }
});

module.exports = router;

