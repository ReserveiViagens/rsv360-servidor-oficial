/**
 * 💬 Rotas RSV360 - Group Chats
 * FASE 2.1.8: Rotas de Group Travel - Chat em Grupo
 */

const express = require("express");
const router = express.Router();
const groupChatService = require("../group-travel/services/group-chat-service");
const {
  sendMessageSchema,
  addParticipantSchema,
} = require("../group-travel/validators/group-chat-validator");
const { advancedJWTValidation } = require("../middleware/advancedAuth");
const { publicRateLimiter } = require("../middleware/rateLimiter");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ service: 'groupChatRoutes' });
const authenticate = advancedJWTValidation;

// Aplicar rate limiting
router.use(publicRateLimiter);

/**
 * GET /api/rsv360/group-chats/booking/:bookingId
 * Obter ou criar chat de uma reserva
 */
router.get("/booking/:bookingId", authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const chat = await groupChatService.getOrCreateChat(parseInt(bookingId));
    const chatWithParticipants = await groupChatService.getChatWithParticipants(
      chat.id,
      req.user.id
    );

    res.json({
      success: true,
      chat: chatWithParticipants,
    });
  } catch (error) {
    logger.error('Erro ao obter/criar chat', { error: error.message });
    res.status(500).json({
      error: "Erro ao obter chat",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/group-chats/:chatId/messages
 * Enviar mensagem no chat
 */
router.post("/:chatId/messages", authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { error, value } = sendMessageSchema.validate({
      ...req.body,
      chat_id: parseInt(chatId),
    });

    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const { message, attachment_url } = value;
    const newMessage = await groupChatService.sendMessage(
      parseInt(chatId),
      req.user.id,
      message,
      attachment_url
    );

    res.status(201).json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    logger.error('Erro ao enviar mensagem', { error: error.message });
    const status = error.message.includes("não é participante") ? 403 : 500;
    res.status(status).json({
      error: "Erro ao enviar mensagem",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/group-chats/:chatId/messages
 * Obter mensagens do chat
 */
router.get("/:chatId/messages", authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before ? parseInt(req.query.before) : null;

    const messages = await groupChatService.getChatMessages(
      parseInt(chatId),
      req.user.id,
      limit,
      before
    );

    res.json({
      success: true,
      chat_id: parseInt(chatId),
      messages,
      count: messages.length,
      limit,
    });
  } catch (error) {
    logger.error('Erro ao obter mensagens', { error: error.message });
    const status = error.message.includes("não é participante") ? 403 : 500;
    res.status(status).json({
      error: "Erro ao obter mensagens",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/group-chats/:chatId/participants
 * Adicionar participante ao chat
 */
router.post("/:chatId/participants", authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { error, value } = addParticipantSchema.validate({
      ...req.body,
      chat_id: parseInt(chatId),
    });

    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const { user_id } = value;
    const chat = await groupChatService.addParticipant(
      parseInt(chatId),
      user_id,
      req.user.id
    );

    res.json({
      success: true,
      chat,
      message: "Participante adicionado com sucesso",
    });
  } catch (error) {
    logger.error('Erro ao adicionar participante', { error: error.message });
    const status = error.message.includes("não tem permissão") ? 403 : 500;
    res.status(status).json({
      error: "Erro ao adicionar participante",
      message: error.message,
    });
  }
});

/**
 * DELETE /api/rsv360/group-chats/:chatId/participants/:userId
 * Remover participante do chat
 */
router.delete("/:chatId/participants/:userId", authenticate, async (req, res) => {
  try {
    const { chatId, userId } = req.params;
    const chat = await groupChatService.removeParticipant(
      parseInt(chatId),
      parseInt(userId)
    );

    res.json({
      success: true,
      chat,
      message: "Participante removido com sucesso",
    });
  } catch (error) {
    logger.error('Erro ao remover participante', { error: error.message });
    res.status(500).json({
      error: "Erro ao remover participante",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/group-chats/:chatId
 * Obter chat com participantes
 */
router.get("/:chatId", authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await groupChatService.getChatWithParticipants(
      parseInt(chatId),
      req.user.id
    );

    res.json({
      success: true,
      chat,
    });
  } catch (error) {
    logger.error('Erro ao obter chat', { error: error.message });
    const status = error.message.includes("não é participante") ? 403 : 500;
    res.status(status).json({
      error: "Erro ao obter chat",
      message: error.message,
    });
  }
});

module.exports = router;

