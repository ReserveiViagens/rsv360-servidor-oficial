/**
 * 💬 Group Chat Service
 * FASE 2.1.5: Serviço de chat em grupo para viagens
 * Gerencia mensagens e participantes do chat
 */

const { db, withTransaction } = require("../../config/database");
const advancedCacheService = require("../../services/advancedCacheService");
const notificationService = require("../../services/notificationService");
const { createLogger } = require("../../utils/logger");

const logger = createLogger({ service: 'groupChatService' });

/**
 * Criar ou obter chat de uma reserva
 * 
 * @param {number} bookingId - ID da reserva
 * @returns {Promise<Object>} Chat criado ou existente
 */
async function getOrCreateChat(bookingId) {
  try {
    // Verificar se chat já existe
    let chat = await db("group_chats")
      .where("booking_id", bookingId)
      .first();

    if (chat) {
      return chat;
    }

    // Criar novo chat
    return await withTransaction(async (trx) => {
      // Buscar participantes da reserva
      const booking = await trx("bookings")
        .where("id", bookingId)
        .first();

      if (!booking) {
        throw new Error("Reserva não encontrada");
      }

      // Participantes iniciais: criador da reserva
      const participants = [booking.user_id];

      // Adicionar participantes de convites aceitos
      const acceptedInvitations = await trx("trip_invitations")
        .where("booking_id", bookingId)
        .where("status", "accepted")
        .select("invited_email");

      for (const inv of acceptedInvitations) {
        const user = await trx("users")
          .where("email", inv.invited_email)
          .first();
        if (user && !participants.includes(user.id)) {
          participants.push(user.id);
        }
      }

      const [newChat] = await trx("group_chats").insert({
        booking_id: bookingId,
        participants: JSON.stringify(participants),
        created_at: new Date(),
      }).returning("*");

      logger.info('Chat criado', { chatId: newChat.id, bookingId, participantsCount: participants.length });

      return {
        ...newChat,
        participants: JSON.parse(newChat.participants || "[]"),
      };
    });
  } catch (error) {
    logger.error('Erro ao criar/obter chat', { bookingId, error: error.message });
    throw error;
  }
}

/**
 * Enviar mensagem no chat
 */
async function sendMessage(chatId, senderId, message, attachmentUrl = null) {
  try {
    // Verificar se chat existe e se usuário é participante
    const chat = await db("group_chats")
      .where("id", chatId)
      .first();

    if (!chat) {
      throw new Error("Chat não encontrado");
    }

    const participants = JSON.parse(chat.participants || "[]");
    if (!participants.includes(senderId)) {
      throw new Error("Usuário não é participante deste chat");
    }

    return await withTransaction(async (trx) => {
      const [newMessage] = await trx("group_chat_messages").insert({
        chat_id: chatId,
        sender_id: senderId,
        message: message.trim(),
        attachment_url: attachmentUrl || null,
        created_at: new Date(),
      }).returning("*");

      // Buscar dados do remetente
      const sender = await trx("users")
        .where("id", senderId)
        .select("name", "email", "avatar_url")
        .first();

      // Notificar outros participantes (exceto o remetente)
      const otherParticipants = participants.filter(id => id !== senderId);
      for (const participantId of otherParticipants) {
        try {
          await notificationService.notifyGroupChatMessage(participantId, {
            chatId,
            messageId: newMessage.id,
            senderName: sender.name,
            message: message.substring(0, 100), // Primeiros 100 caracteres
          });
        } catch (error) {
          logger.warn('Erro ao notificar participante', { 
            participantId, 
            error: error.message 
          });
        }
      }

      // Invalidar cache
      await advancedCacheService.invalidateCache(`group_chat:${chatId}*`);

      logger.info('Mensagem enviada', { messageId: newMessage.id, chatId, senderId });

      return {
        ...newMessage,
        sender: {
          name: sender.name,
          email: sender.email,
          avatar: sender.avatar_url,
        },
      };
    });
  } catch (error) {
    logger.error('Erro ao enviar mensagem', { chatId, senderId, error: error.message });
    throw error;
  }
}

/**
 * Obter mensagens do chat
 */
async function getChatMessages(chatId, userId, limit = 50, before = null) {
  try {
    // Verificar se usuário é participante
    const chat = await db("group_chats")
      .where("id", chatId)
      .first();

    if (!chat) {
      throw new Error("Chat não encontrado");
    }

    const participants = JSON.parse(chat.participants || "[]");
    if (!participants.includes(userId)) {
      throw new Error("Usuário não é participante deste chat");
    }

    let query = db("group_chat_messages")
      .select(
        "group_chat_messages.*",
        "users.name as sender_name",
        "users.email as sender_email",
        "users.avatar_url as sender_avatar"
      )
      .leftJoin("users", "group_chat_messages.sender_id", "users.id")
      .where("group_chat_messages.chat_id", chatId)
      .orderBy("group_chat_messages.created_at", "desc")
      .limit(limit);

    if (before) {
      query = query.where("group_chat_messages.id", "<", before);
    }

    const messages = await query;

    // Marcar mensagens como lidas
    await db("group_chat_messages")
      .where("chat_id", chatId)
      .where("sender_id", "!=", userId)
      .whereNull("read_at")
      .update({
        read_at: new Date(),
      });

    return messages.map(msg => ({
      id: msg.id,
      chat_id: msg.chat_id,
      sender_id: msg.sender_id,
      message: msg.message,
      attachment_url: msg.attachment_url,
      created_at: msg.created_at,
      read_at: msg.read_at,
      sender: {
        name: msg.sender_name,
        email: msg.sender_email,
        avatar: msg.sender_avatar,
      },
    })).reverse(); // Reverter para ordem cronológica
  } catch (error) {
    logger.error('Erro ao obter mensagens do chat', { chatId, error: error.message });
    throw error;
  }
}

/**
 * Adicionar participante ao chat
 */
async function addParticipant(chatId, userId, addedBy) {
  try {
    return await withTransaction(async (trx) => {
      const chat = await trx("group_chats")
        .where("id", chatId)
        .first();

      if (!chat) {
        throw new Error("Chat não encontrado");
      }

      // Verificar se quem está adicionando é participante
      const participants = JSON.parse(chat.participants || "[]");
      if (!participants.includes(addedBy)) {
        throw new Error("Apenas participantes podem adicionar outros membros");
      }

      if (participants.includes(userId)) {
        return chat; // Já é participante
      }

      participants.push(userId);

      await trx("group_chats")
        .where("id", chatId)
        .update({
          participants: JSON.stringify(participants),
          updated_at: new Date(),
        });

      // Adicionar mensagem de sistema
      const addedUser = await trx("users")
        .where("id", userId)
        .select("name")
        .first();

      await trx("group_chat_messages").insert({
        chat_id: chatId,
        sender_id: userId,
        message: `${addedUser.name} entrou no grupo`,
        created_at: new Date(),
      });

      // Invalidar cache
      await advancedCacheService.invalidateCache(`group_chat:${chatId}*`);

      logger.info('Participante adicionado', { chatId, userId });

      return {
        ...chat,
        participants,
      };
    });
  } catch (error) {
    logger.error('Erro ao adicionar participante', { chatId, userId, error: error.message });
    throw error;
  }
}

/**
 * Remover participante do chat
 */
async function removeParticipant(chatId, userId) {
  try {
    return await withTransaction(async (trx) => {
      const chat = await trx("group_chats")
        .where("id", chatId)
        .first();

      if (!chat) {
        throw new Error("Chat não encontrado");
      }

      const participants = JSON.parse(chat.participants || "[]");
      if (!participants.includes(userId)) {
        return chat; // Já não é participante
      }

      const updatedParticipants = participants.filter(id => id !== userId);

      if (updatedParticipants.length === 0) {
        throw new Error("Não é possível remover o último participante");
      }

      await trx("group_chats")
        .where("id", chatId)
        .update({
          participants: JSON.stringify(updatedParticipants),
          updated_at: new Date(),
        });

      // Adicionar mensagem de sistema
      const removedUser = await trx("users")
        .where("id", userId)
        .select("name")
        .first();

      await trx("group_chat_messages").insert({
        chat_id: chatId,
        sender_id: userId,
        message: `${removedUser.name} saiu do grupo`,
        created_at: new Date(),
      });

      // Invalidar cache
      await advancedCacheService.invalidateCache(`group_chat:${chatId}*`);

      logger.info('Participante removido', { chatId, userId });

      return {
        ...chat,
        participants: updatedParticipants,
      };
    });
  } catch (error) {
    logger.error('Erro ao remover participante', { chatId, userId, error: error.message });
    throw error;
  }
}

/**
 * Obter chat com participantes
 */
async function getChatWithParticipants(chatId, userId) {
  try {
    const chat = await db("group_chats")
      .where("id", chatId)
      .first();

    if (!chat) {
      throw new Error("Chat não encontrado");
    }

    const participants = JSON.parse(chat.participants || "[]");
    
    // Verificar se usuário é participante
    if (!participants.includes(userId)) {
      throw new Error("Usuário não é participante deste chat");
    }

    // Buscar dados dos participantes
    const participantsData = await db("users")
      .whereIn("id", participants)
      .select("id", "name", "email", "avatar_url");

    return {
      id: chat.id,
      booking_id: chat.booking_id,
      participants: participantsData,
      created_at: chat.created_at,
      updated_at: chat.updated_at,
    };
  } catch (error) {
    logger.error('Erro ao obter chat com participantes', { chatId, error: error.message });
    throw error;
  }
}

module.exports = {
  getOrCreateChat,
  sendMessage,
  getChatMessages,
  addParticipant,
  removeParticipant,
  getChatWithParticipants,
};

