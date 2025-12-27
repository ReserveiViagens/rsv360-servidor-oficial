/**
 * ✉️ Rotas RSV360 - Trip Invitations
 * FASE 2.1.8: Rotas de Group Travel - Convites de Viagem
 */

const express = require("express");
const router = express.Router();
const tripInvitationService = require("../group-travel/services/trip-invitation-service");
const {
  createInvitationSchema,
  acceptInvitationSchema,
  declineInvitationSchema,
} = require("../group-travel/validators/trip-invitation-validator");
const { advancedJWTValidation } = require("../middleware/advancedAuth");
const { publicRateLimiter } = require("../middleware/rateLimiter");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ service: 'tripInvitationRoutes' });
const authenticate = advancedJWTValidation;

// Aplicar rate limiting
router.use(publicRateLimiter);

/**
 * POST /api/rsv360/trip-invitations
 * Criar convite para viagem
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const { error, value } = createInvitationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const { booking_id, invited_email, message } = value;
    const invitation = await tripInvitationService.createInvitation(
      booking_id,
      req.user.id,
      invited_email,
      message
    );

    res.status(201).json({
      success: true,
      invitation,
      message: "Convite enviado com sucesso",
    });
  } catch (error) {
    logger.error('Erro ao criar convite', { error: error.message });
    res.status(500).json({
      error: "Erro ao criar convite",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/trip-invitations/booking/:bookingId
 * Obter convites de uma reserva
 */
router.get("/booking/:bookingId", authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const invitations = await tripInvitationService.getBookingInvitations(parseInt(bookingId));

    res.json({
      success: true,
      booking_id: parseInt(bookingId),
      invitations,
      count: invitations.length,
    });
  } catch (error) {
    logger.error('Erro ao obter convites', { error: error.message });
    res.status(500).json({
      error: "Erro ao obter convites",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/trip-invitations/accept
 * Aceitar convite (não requer autenticação - usa token)
 */
router.post("/accept", async (req, res) => {
  try {
    const { error, value } = acceptInvitationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const { token } = value;

    // Buscar convite para obter email
    const invitation = await tripInvitationService.getInvitationByToken(token);
    if (!invitation) {
      return res.status(404).json({
        error: "Convite não encontrado",
      });
    }

    // Buscar usuário por email (assumindo que usuário está autenticado ou será criado)
    // Por enquanto, requer userId no body
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({
        error: "user_id é obrigatório",
        message: "Forneça o ID do usuário que está aceitando o convite",
      });
    }

    const result = await tripInvitationService.acceptInvitation(token, user_id);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Erro ao aceitar convite', { error: error.message });
    const status = error.message.includes("expirado") ? 410 : 500;
    res.status(status).json({
      error: "Erro ao aceitar convite",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/trip-invitations/decline
 * Recusar convite (não requer autenticação - usa token)
 */
router.post("/decline", async (req, res) => {
  try {
    const { error, value } = declineInvitationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const { token } = value;
    const result = await tripInvitationService.declineInvitation(token);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Erro ao recusar convite', { error: error.message });
    res.status(500).json({
      error: "Erro ao recusar convite",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/trip-invitations/token/:token
 * Obter informações do convite por token (público)
 */
router.get("/token/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const invitation = await tripInvitationService.getInvitationByToken(token);

    if (!invitation) {
      return res.status(404).json({
        error: "Convite não encontrado",
      });
    }

    // Buscar dados da reserva
    const { db } = require("../config/database");
    const booking = await db("bookings")
      .where("id", invitation.booking_id)
      .first();

    res.json({
      success: true,
      invitation: {
        id: invitation.id,
        booking_id: invitation.booking_id,
        invited_email: invitation.invited_email,
        status: invitation.status,
        expires_at: invitation.expires_at,
        created_at: invitation.created_at,
      },
      booking: booking ? {
        id: booking.id,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        total_amount: booking.total_amount,
      } : null,
    });
  } catch (error) {
    logger.error('Erro ao obter convite por token', { error: error.message });
    res.status(500).json({
      error: "Erro ao obter convite",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/trip-invitations/:invitationId/resend
 * Reenviar convite
 */
router.post("/:invitationId/resend", authenticate, async (req, res) => {
  try {
    const { invitationId } = req.params;
    const invitation = await tripInvitationService.resendInvitation(parseInt(invitationId));

    res.json({
      success: true,
      invitation,
      message: "Convite reenviado com sucesso",
    });
  } catch (error) {
    logger.error('Erro ao reenviar convite', { error: error.message });
    res.status(500).json({
      error: "Erro ao reenviar convite",
      message: error.message,
    });
  }
});

/**
 * DELETE /api/rsv360/trip-invitations/:invitationId
 * Cancelar convite
 */
router.delete("/:invitationId", authenticate, async (req, res) => {
  try {
    const { invitationId } = req.params;
    await tripInvitationService.cancelInvitation(parseInt(invitationId));

    res.json({
      success: true,
      message: "Convite cancelado com sucesso",
    });
  } catch (error) {
    logger.error('Erro ao cancelar convite', { error: error.message });
    res.status(500).json({
      error: "Erro ao cancelar convite",
      message: error.message,
    });
  }
});

module.exports = router;

