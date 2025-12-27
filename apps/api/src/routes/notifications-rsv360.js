/**
 * 📬 Notifications API Routes
 * FASE: Rotas para gerenciamento de notificações
 */

const express = require("express");
const Joi = require("joi");
const router = express.Router();
const { db } = require("../config/database");
const { advancedJWTValidation, requireRole } = require("../middleware/advancedAuth");
const { createLogger } = require("../utils/logger");
const notificationService = require("../services/notificationService");

const logger = createLogger({ service: 'notificationsRoutes' });
const authenticate = advancedJWTValidation;

// Schemas de validação
const createNotificationSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  message: Joi.string().min(1).max(1000).required(),
  type: Joi.string().valid('info', 'success', 'warning', 'error', 'promotion').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  action_url: Joi.string().uri().optional().allow(null, ''),
  category: Joi.string().max(50).optional(),
  metadata: Joi.object().optional(),
});

const updatePreferencesSchema = Joi.object({
  email_enabled: Joi.boolean().optional(),
  sms_enabled: Joi.boolean().optional(),
  push_enabled: Joi.boolean().optional(),
  whatsapp_enabled: Joi.boolean().optional(),
  categories: Joi.object().optional(),
});

/**
 * GET /api/rsv360/notifications
 * Listar notificações do usuário autenticado
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      filter = 'all', // all, unread, read, archived
      type,
      category,
      priority,
      search
    } = req.query;

    let query = db("notifications")
      .where("user_id", userId)
      .where("archived", false);

    // Filtro por status
    if (filter === 'unread') {
      query = query.where("read", false);
    } else if (filter === 'read') {
      query = query.where("read", true);
    }

    // Filtro por tipo
    if (type) {
      query = query.where("type", type);
    }

    // Filtro por categoria
    if (category) {
      query = query.where("category", category);
    }

    // Filtro por prioridade
    if (priority) {
      query = query.where("priority", priority);
    }

    // Busca por texto
    if (search) {
      query = query.where(function() {
        this.where("title", "ilike", `%${search}%`)
            .orWhere("message", "ilike", `%${search}%`);
      });
    }

    // Contar total
    const totalQuery = query.clone();
    const [{ count }] = await totalQuery.count("* as count");
    const total = parseInt(count);

    // Paginação
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const notifications = await query
      .orderBy("created_at", "desc")
      .limit(parseInt(limit))
      .offset(offset);

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Erro ao listar notificações', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * GET /api/rsv360/notifications/:id
 * Obter notificação específica
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await db("notifications")
      .where({ id: parseInt(id), user_id: userId })
      .first();

    if (!notification) {
      return res.status(404).json({ error: "Notificação não encontrada" });
    }

    res.json(notification);
  } catch (error) {
    logger.error('Erro ao obter notificação', { id: req.params.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * POST /api/rsv360/notifications
 * Criar nova notificação (apenas admin)
 */
router.post("/", authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { error, value } = createNotificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: "Dados inválidos", 
        details: error.details.map(d => d.message) 
      });
    }

    const { user_id, ...notificationData } = value;
    const targetUserId = user_id || req.user.id;

    const [notification] = await db("notifications")
      .insert({
        user_id: targetUserId,
        ...notificationData,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning("*");

    // Enviar via WebSocket se disponível
    try {
      const { sendNotificationToUser } = require("../utils/websocket");
      if (sendNotificationToUser) {
        sendNotificationToUser(targetUserId, {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.metadata || {},
        });
      }
    } catch (wsError) {
      logger.warn('WebSocket não disponível para notificação', { error: wsError.message });
    }

    res.status(201).json(notification);
  } catch (error) {
    logger.error('Erro ao criar notificação', { body: req.body, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * PUT /api/rsv360/notifications/:id/read
 * Marcar notificação como lida
 */
router.put("/:id/read", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [notification] = await db("notifications")
      .where({ id: parseInt(id), user_id: userId })
      .update({
        read: true,
        read_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning("*");

    if (!notification) {
      return res.status(404).json({ error: "Notificação não encontrada" });
    }

    res.json(notification);
  } catch (error) {
    logger.error('Erro ao marcar notificação como lida', { id: req.params.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * PUT /api/rsv360/notifications/read-all
 * Marcar todas as notificações como lidas
 */
router.put("/read-all", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const updated = await db("notifications")
      .where({ user_id: userId, read: false })
      .update({
        read: true,
        read_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

    res.json({ 
      message: "Todas as notificações foram marcadas como lidas",
      updated: updated 
    });
  } catch (error) {
    logger.error('Erro ao marcar todas como lidas', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * DELETE /api/rsv360/notifications/:id
 * Deletar notificação
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deleted = await db("notifications")
      .where({ id: parseInt(id), user_id: userId })
      .del();

    if (deleted === 0) {
      return res.status(404).json({ error: "Notificação não encontrada" });
    }

    res.json({ message: "Notificação deletada com sucesso" });
  } catch (error) {
    logger.error('Erro ao deletar notificação', { id: req.params.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * PUT /api/rsv360/notifications/:id/archive
 * Arquivar notificação
 */
router.put("/:id/archive", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [notification] = await db("notifications")
      .where({ id: parseInt(id), user_id: userId })
      .update({
        archived: true,
        updated_at: db.fn.now(),
      })
      .returning("*");

    if (!notification) {
      return res.status(404).json({ error: "Notificação não encontrada" });
    }

    res.json(notification);
  } catch (error) {
    logger.error('Erro ao arquivar notificação', { id: req.params.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * GET /api/rsv360/notifications/preferences
 * Obter preferências de notificações do usuário
 */
router.get("/preferences", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    let preferences = await db("notification_preferences")
      .where("user_id", userId)
      .first();

    // Se não existir, criar com valores padrão
    if (!preferences) {
      [preferences] = await db("notification_preferences")
        .insert({
          user_id: userId,
          email_enabled: true,
          sms_enabled: false,
          push_enabled: true,
          whatsapp_enabled: false,
          categories: JSON.stringify({
            auctions: true,
            payments: true,
            bookings: true,
            promotions: true,
            system: true,
          }),
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning("*");
    }

    // Parse JSON categories se for string
    if (typeof preferences.categories === 'string') {
      preferences.categories = JSON.parse(preferences.categories);
    }

    res.json(preferences);
  } catch (error) {
    logger.error('Erro ao obter preferências', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * PUT /api/rsv360/notifications/preferences
 * Atualizar preferências de notificações
 */
router.put("/preferences", authenticate, async (req, res) => {
  try {
    const { error, value } = updatePreferencesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: "Dados inválidos", 
        details: error.details.map(d => d.message) 
      });
    }

    const userId = req.user.id;

    // Converter categories para JSON se for objeto
    const updateData = { ...value };
    if (updateData.categories && typeof updateData.categories === 'object') {
      updateData.categories = JSON.stringify(updateData.categories);
    }

    let preferences = await db("notification_preferences")
      .where("user_id", userId)
      .first();

    if (preferences) {
      // Atualizar existente
      [preferences] = await db("notification_preferences")
        .where("user_id", userId)
        .update({
          ...updateData,
          updated_at: db.fn.now(),
        })
        .returning("*");
    } else {
      // Criar novo
      [preferences] = await db("notification_preferences")
        .insert({
          user_id: userId,
          email_enabled: value.email_enabled !== undefined ? value.email_enabled : true,
          sms_enabled: value.sms_enabled !== undefined ? value.sms_enabled : false,
          push_enabled: value.push_enabled !== undefined ? value.push_enabled : true,
          whatsapp_enabled: value.whatsapp_enabled !== undefined ? value.whatsapp_enabled : false,
          categories: updateData.categories || JSON.stringify({
            auctions: true,
            payments: true,
            bookings: true,
            promotions: true,
            system: true,
          }),
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning("*");
    }

    // Parse JSON categories se for string
    if (typeof preferences.categories === 'string') {
      preferences.categories = JSON.parse(preferences.categories);
    }

    res.json(preferences);
  } catch (error) {
    logger.error('Erro ao atualizar preferências', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * GET /api/rsv360/notifications/stats
 * Obter estatísticas de notificações (contagem de não lidas, etc)
 */
router.get("/stats", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await db("notifications")
      .where("user_id", userId)
      .where("archived", false)
      .select(
        db.raw("COUNT(*) as total"),
        db.raw("COUNT(CASE WHEN read = false THEN 1 END) as unread"),
        db.raw("COUNT(CASE WHEN read = true THEN 1 END) as read"),
        db.raw("COUNT(CASE WHEN type = 'info' THEN 1 END) as info"),
        db.raw("COUNT(CASE WHEN type = 'success' THEN 1 END) as success"),
        db.raw("COUNT(CASE WHEN type = 'warning' THEN 1 END) as warning"),
        db.raw("COUNT(CASE WHEN type = 'error' THEN 1 END) as error"),
        db.raw("COUNT(CASE WHEN type = 'promotion' THEN 1 END) as promotion")
      )
      .first();

    res.json({
      total: parseInt(stats.total || 0),
      unread: parseInt(stats.unread || 0),
      read: parseInt(stats.read || 0),
      byType: {
        info: parseInt(stats.info || 0),
        success: parseInt(stats.success || 0),
        warning: parseInt(stats.warning || 0),
        error: parseInt(stats.error || 0),
        promotion: parseInt(stats.promotion || 0),
      },
    });
  } catch (error) {
    logger.error('Erro ao obter estatísticas', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

module.exports = router;

