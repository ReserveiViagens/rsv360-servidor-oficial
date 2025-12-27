/**
 * ✉️ Trip Invitation Service
 * FASE 2.1.4: Serviço de convites para viagens em grupo
 * Gerencia convites por email com tokens e expiração
 */

const { db, withTransaction } = require("../../config/database");
const crypto = require("crypto");
const notificationService = require("../../services/notificationService");
const { createLogger } = require("../../utils/logger");

const logger = createLogger({ service: 'tripInvitationService' });

// Token expira em 7 dias
const TOKEN_EXPIRY_DAYS = 7;

/**
 * Criar convite para viagem
 * 
 * @param {number} bookingId - ID da reserva
 * @param {number} invitedBy - ID do usuário que está convidando
 * @param {string} invitedEmail - Email do convidado
 * @param {string} [message] - Mensagem opcional
 * @returns {Promise<Object>} Convite criado
 */
async function createInvitation(bookingId, invitedBy, invitedEmail, message = null) {
  try {
    // Verificar se reserva existe
    const booking = await db("bookings")
      .where("id", bookingId)
      .first();

    if (!booking) {
      throw new Error("Reserva não encontrada");
    }

    // Verificar se email já foi convidado
    const existing = await db("trip_invitations")
      .where({
        booking_id: bookingId,
        invited_email: invitedEmail.toLowerCase(),
        status: 'pending',
      })
      .first();

    if (existing) {
      throw new Error("Este email já foi convidado para esta viagem");
    }

    // Gerar token único
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

    return await withTransaction(async (trx) => {
      const [invitation] = await trx("trip_invitations").insert({
        booking_id: bookingId,
        invited_by: invitedBy,
        invited_email: invitedEmail.toLowerCase(),
        token,
        status: 'pending',
        expires_at: expiresAt,
        created_at: new Date(),
      }).returning("*");

      // Enviar email de convite
      try {
        await notificationService.notifyTripInvitation(invitation.id, invitedEmail, {
          bookingId,
          token,
          message,
        });
      } catch (error) {
        logger.warn('Erro ao enviar email de convite', { 
          invitationId: invitation.id, 
          error: error.message 
        });
      }

      logger.info('Convite criado', { invitationId: invitation.id, bookingId, invitedEmail });

      return invitation;
    });
  } catch (error) {
    logger.error('Erro ao criar convite', { bookingId, invitedEmail, error: error.message });
    throw error;
  }
}

/**
 * Aceitar convite
 */
async function acceptInvitation(token, userId) {
  try {
    return await withTransaction(async (trx) => {
      const invitation = await trx("trip_invitations")
        .where("token", token)
        .where("status", "pending")
        .first();

      if (!invitation) {
        throw new Error("Convite não encontrado ou já processado");
      }

      // Verificar se expirou
      if (new Date() > new Date(invitation.expires_at)) {
        await trx("trip_invitations")
          .where("id", invitation.id)
          .update({
            status: 'expired',
            updated_at: new Date(),
          });
        throw new Error("Convite expirado");
      }

      // Verificar se email corresponde ao usuário
      const user = await trx("users")
        .where("id", userId)
        .first();

      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      if (user.email.toLowerCase() !== invitation.invited_email.toLowerCase()) {
        throw new Error("Este convite não é para este usuário");
      }

      // Atualizar convite
      await trx("trip_invitations")
        .where("id", invitation.id)
        .update({
          status: 'accepted',
          accepted_at: new Date(),
          updated_at: new Date(),
        });

      // Adicionar usuário ao grupo de chat (se existir)
      const chat = await trx("group_chats")
        .where("booking_id", invitation.booking_id)
        .first();

      if (chat) {
        // Verificar se já é participante
        const existingMember = await trx("group_chat_messages")
          .where("chat_id", chat.id)
          .where("sender_id", userId)
          .first();

        if (!existingMember) {
          // Adicionar mensagem de boas-vindas
          await trx("group_chat_messages").insert({
            chat_id: chat.id,
            sender_id: userId,
            message: `${user.name} aceitou o convite e entrou no grupo`,
            created_at: new Date(),
          });
        }
      }

      logger.info('Convite aceito', { invitationId: invitation.id, userId });

      return {
        success: true,
        invitation_id: invitation.id,
        booking_id: invitation.booking_id,
      };
    });
  } catch (error) {
    logger.error('Erro ao aceitar convite', { token, userId, error: error.message });
    throw error;
  }
}

/**
 * Recusar convite
 */
async function declineInvitation(token) {
  try {
    const invitation = await db("trip_invitations")
      .where("token", token)
      .where("status", "pending")
      .first();

    if (!invitation) {
      throw new Error("Convite não encontrado ou já processado");
    }

    await db("trip_invitations")
      .where("id", invitation.id)
      .update({
        status: 'declined',
        updated_at: new Date(),
      });

    logger.info('Convite recusado', { invitationId: invitation.id });

    return { success: true };
  } catch (error) {
    logger.error('Erro ao recusar convite', { token, error: error.message });
    throw error;
  }
}

/**
 * Obter convites de uma reserva
 */
async function getBookingInvitations(bookingId) {
  try {
    const invitations = await db("trip_invitations")
      .select(
        "trip_invitations.*",
        "users.name as inviter_name",
        "users.email as inviter_email"
      )
      .leftJoin("users", "trip_invitations.invited_by", "users.id")
      .where("trip_invitations.booking_id", bookingId)
      .orderBy("trip_invitations.created_at", "desc");

    return invitations.map(inv => ({
      id: inv.id,
      booking_id: inv.booking_id,
      invited_by: inv.invited_by,
      invited_email: inv.invited_email,
      status: inv.status,
      expires_at: inv.expires_at,
      created_at: inv.created_at,
      accepted_at: inv.accepted_at,
      inviter: {
        name: inv.inviter_name,
        email: inv.inviter_email,
      },
    }));
  } catch (error) {
    logger.error('Erro ao obter convites da reserva', { bookingId, error: error.message });
    throw error;
  }
}

/**
 * Obter convite por token
 */
async function getInvitationByToken(token) {
  try {
    const invitation = await db("trip_invitations")
      .where("token", token)
      .first();

    if (!invitation) {
      return null;
    }

    // Verificar se expirou
    if (new Date() > new Date(invitation.expires_at) && invitation.status === 'pending') {
      await db("trip_invitations")
        .where("id", invitation.id)
        .update({
          status: 'expired',
          updated_at: new Date(),
        });
      invitation.status = 'expired';
    }

    return invitation;
  } catch (error) {
    logger.error('Erro ao obter convite por token', { token, error: error.message });
    throw error;
  }
}

/**
 * Reenviar convite
 */
async function resendInvitation(invitationId) {
  try {
    const invitation = await db("trip_invitations")
      .where("id", invitationId)
      .first();

    if (!invitation) {
      throw new Error("Convite não encontrado");
    }

    if (invitation.status !== 'pending') {
      throw new Error("Apenas convites pendentes podem ser reenviados");
    }

    // Verificar se expirou
    if (new Date() > new Date(invitation.expires_at)) {
      // Renovar token e expiração
      const newToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

      await db("trip_invitations")
        .where("id", invitationId)
        .update({
          token: newToken,
          expires_at: expiresAt,
          updated_at: new Date(),
        });

      invitation.token = newToken;
      invitation.expires_at = expiresAt;
    }

    // Reenviar email
    try {
      await notificationService.notifyTripInvitation(invitationId, invitation.invited_email, {
        bookingId: invitation.booking_id,
        token: invitation.token,
      });
    } catch (error) {
      logger.warn('Erro ao reenviar email de convite', { 
        invitationId, 
        error: error.message 
      });
    }

    logger.info('Convite reenviado', { invitationId });

    return invitation;
  } catch (error) {
    logger.error('Erro ao reenviar convite', { invitationId, error: error.message });
    throw error;
  }
}

/**
 * Cancelar convite
 */
async function cancelInvitation(invitationId) {
  try {
    const invitation = await db("trip_invitations")
      .where("id", invitationId)
      .first();

    if (!invitation) {
      throw new Error("Convite não encontrado");
    }

    if (invitation.status !== 'pending') {
      throw new Error("Apenas convites pendentes podem ser cancelados");
    }

    await db("trip_invitations")
      .where("id", invitationId)
      .update({
        status: 'cancelled',
        updated_at: new Date(),
      });

    logger.info('Convite cancelado', { invitationId });

    return { success: true };
  } catch (error) {
    logger.error('Erro ao cancelar convite', { invitationId, error: error.message });
    throw error;
  }
}

module.exports = {
  createInvitation,
  acceptInvitation,
  declineInvitation,
  getBookingInvitations,
  getInvitationByToken,
  resendInvitation,
  cancelInvitation,
};

