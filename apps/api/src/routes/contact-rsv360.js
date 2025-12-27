/**
 * 📧 Contact API Routes
 * FASE: Rotas para formulário de contato
 */

const express = require("express");
const Joi = require("joi");
const router = express.Router();
const { db } = require("../config/database");
const { advancedJWTValidation, requireRole } = require("../middleware/advancedAuth");
const { createLogger } = require("../utils/logger");
const notificationService = require("../services/notificationService");

const logger = createLogger({ service: 'contactRoutes' });
const authenticate = advancedJWTValidation;

// Schema de validação
const createMessageSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  subject: Joi.string().min(3).max(200).required(),
  message: Joi.string().min(10).max(2000).required(),
});

/**
 * POST /api/rsv360/contact
 * Criar nova mensagem de contato (público)
 */
router.post("/", async (req, res) => {
  try {
    const { error, value } = createMessageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: "Dados inválidos", 
        details: error.details.map(d => d.message) 
      });
    }

    // Obter user_id se houver token
    let userId = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // Token inválido ou não fornecido - continuar como anônimo
      }
    }

    const [message] = await db("contact_messages")
      .insert({
        ...value,
        user_id: userId,
        status: 'new',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning("*");

    // Notificar administradores (opcional)
    try {
      await notificationService.queueNotification(
        "email",
        process.env.ADMIN_EMAIL || "admin@rsv360.com",
        {
          subject: `Nova mensagem de contato: ${value.subject}`,
          html: `
            <h2>Nova Mensagem de Contato</h2>
            <p><strong>Nome:</strong> ${value.name}</p>
            <p><strong>Email:</strong> ${value.email}</p>
            <p><strong>Assunto:</strong> ${value.subject}</p>
            <p><strong>Mensagem:</strong></p>
            <p>${value.message}</p>
          `,
        }
      );
    } catch (notifError) {
      logger.warn('Erro ao enviar notificação de contato', { error: notifError.message });
    }

    res.status(201).json({
      message: "Mensagem enviada com sucesso! Entraremos em contato em breve.",
      id: message.id,
    });
  } catch (error) {
    logger.error('Erro ao criar mensagem de contato', { body: req.body, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * GET /api/rsv360/contact
 * Listar mensagens de contato (apenas admin)
 */
router.get("/", authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    let query = db("contact_messages").select("*");

    if (status) {
      query = query.where("status", status);
    }

    // Contar total
    const totalQuery = query.clone();
    const [{ count }] = await totalQuery.count("* as count");
    const total = parseInt(count);

    // Paginação
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const messages = await query
      .orderBy("created_at", "desc")
      .limit(parseInt(limit))
      .offset(offset);

    res.json({
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Erro ao listar mensagens de contato', { error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * GET /api/rsv360/contact/:id
 * Obter mensagem específica (apenas admin)
 */
router.get("/:id", authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const message = await db("contact_messages")
      .where({ id: parseInt(id) })
      .first();

    if (!message) {
      return res.status(404).json({ error: "Mensagem não encontrada" });
    }

    res.json(message);
  } catch (error) {
    logger.error('Erro ao obter mensagem de contato', { id: req.params.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * PUT /api/rsv360/contact/:id/status
 * Atualizar status da mensagem (apenas admin)
 */
router.put("/:id/status", authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['new', 'read', 'replied', 'archived'].includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }

    const [message] = await db("contact_messages")
      .where({ id: parseInt(id) })
      .update({
        status,
        updated_at: db.fn.now(),
      })
      .returning("*");

    if (!message) {
      return res.status(404).json({ error: "Mensagem não encontrada" });
    }

    res.json(message);
  } catch (error) {
    logger.error('Erro ao atualizar status da mensagem', { id: req.params.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * PUT /api/rsv360/contact/:id/reply
 * Responder mensagem (apenas admin)
 */
router.put("/:id/reply", authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reply_message } = req.body;

    if (!reply_message || reply_message.trim().length < 10) {
      return res.status(400).json({ error: "Mensagem de resposta inválida" });
    }

    const [message] = await db("contact_messages")
      .where({ id: parseInt(id) })
      .update({
        status: 'replied',
        reply_message: reply_message.trim(),
        replied_by_user_id: req.user.id,
        replied_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning("*");

    if (!message) {
      return res.status(404).json({ error: "Mensagem não encontrada" });
    }

    // Enviar email de resposta (opcional)
    try {
      await notificationService.queueNotification(
        "email",
        message.email,
        {
          subject: `Re: ${message.subject}`,
          html: `
            <p>Olá ${message.name},</p>
            <p>${reply_message}</p>
            <p>---</p>
            <p>Equipe RSV360</p>
          `,
        }
      );
    } catch (emailError) {
      logger.warn('Erro ao enviar email de resposta', { error: emailError.message });
    }

    res.json(message);
  } catch (error) {
    logger.error('Erro ao responder mensagem', { id: req.params.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

module.exports = router;

