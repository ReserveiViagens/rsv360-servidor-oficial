/**
 * 🧮 Quotations API Routes
 * FASE: Rotas para cotações/orçamentos
 */

const express = require("express");
const Joi = require("joi");
const router = express.Router();
const { db } = require("../config/database");
const { advancedJWTValidation, requireRole } = require("../middleware/advancedAuth");
const { createLogger } = require("../utils/logger");
const { v4: uuidv4 } = require("uuid");

const logger = createLogger({ service: 'quotationsRoutes' });
const authenticate = advancedJWTValidation;

// Schema de validação básico (validação completa será feita no frontend)
const createQuotationSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  client_name: Joi.string().min(2).max(100).required(),
  client_email: Joi.string().email().required(),
  client_phone: Joi.string().min(10).max(20).required(),
  client_document: Joi.string().optional(),
  type: Joi.string().valid("hotel", "parque", "atracao", "passeio", "personalizado").required(),
  budget_data: Joi.object().required(), // Objeto Budget completo
});

const updateQuotationSchema = Joi.object({
  title: Joi.string().min(3).max(200).optional(),
  client_name: Joi.string().min(2).max(100).optional(),
  client_email: Joi.string().email().optional(),
  client_phone: Joi.string().min(10).max(20).optional(),
  status: Joi.string().valid("draft", "sent", "approved", "rejected", "expired").optional(),
  valid_until: Joi.date().iso().optional(),
  budget_data: Joi.object().optional(),
});

/**
 * GET /api/rsv360/quotations
 * Listar cotações
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20, search, period } = req.query;

    let query = db("quotations");

    // Filtrar por tipo
    if (type && type !== 'all') {
      query = query.where("type", type);
    }

    // Filtrar por status
    if (status && status !== 'all') {
      query = query.where("status", status);
    }

    // Busca por texto
    if (search) {
      query = query.where(function() {
        this.where("title", "ilike", `%${search}%`)
            .orWhere("client_name", "ilike", `%${search}%`)
            .orWhere("client_email", "ilike", `%${search}%`);
      });
    }

    // Filtrar por período
    if (period && period !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'last7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'thismonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'thisyear':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        query = query.where("created_at", ">=", startDate.toISOString());
      }
    }

    // Contar total
    const totalQuery = query.clone();
    const [{ count }] = await totalQuery.count("* as count");
    const total = parseInt(count);

    // Paginação
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const quotations = await query
      .orderBy("created_at", "desc")
      .limit(parseInt(limit))
      .offset(offset);

    // Formatar cotações (parsear budget_data)
    const formattedQuotations = quotations.map(q => {
      const budgetData = typeof q.budget_data === 'string' 
        ? JSON.parse(q.budget_data) 
        : q.budget_data;
      
      return {
        id: q.budget_id,
        title: q.title,
        clientName: q.client_name,
        clientEmail: q.client_email,
        clientPhone: q.client_phone,
        type: q.type,
        status: q.status,
        total: parseFloat(q.total || 0),
        createdAt: q.created_at,
        validUntil: q.valid_until || q.expires_at,
        ...budgetData, // Incluir todos os dados do budget_data
      };
    });

    res.json({
      quotations: formattedQuotations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Erro ao listar cotações', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * GET /api/rsv360/quotations/:id
 * Obter cotação específica
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const quotation = await db("quotations")
      .where("budget_id", id)
      .first();

    if (!quotation) {
      return res.status(404).json({ error: "Cotação não encontrada" });
    }

    // Parsear budget_data
    const budgetData = typeof quotation.budget_data === 'string' 
      ? JSON.parse(quotation.budget_data) 
      : quotation.budget_data;

    const formattedQuotation = {
      id: quotation.budget_id,
      title: quotation.title,
      clientName: quotation.client_name,
      clientEmail: quotation.client_email,
      clientPhone: quotation.client_phone,
      type: quotation.type,
      status: quotation.status,
      total: parseFloat(quotation.total || 0),
      createdAt: quotation.created_at,
      validUntil: quotation.valid_until || quotation.expires_at,
      ...budgetData, // Incluir todos os dados do budget_data
    };

    res.json(formattedQuotation);
  } catch (error) {
    logger.error('Erro ao obter cotação', { id: req.params.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * POST /api/rsv360/quotations
 * Criar nova cotação
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const { error, value } = createQuotationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: "Dados inválidos", 
        details: error.details.map(d => d.message) 
      });
    }

    // Gerar budget_id se não fornecido
    const budgetId = value.budget_data?.id || uuidv4();
    
    // Calcular valores se não fornecidos
    const budgetData = value.budget_data || {};
    const subtotal = budgetData.subtotal || 0;
    const discount = budgetData.discount || 0;
    const taxes = budgetData.taxes || 0;
    const total = subtotal - discount + taxes;

    // Calcular valid_until (30 dias por padrão)
    const validUntil = budgetData.validUntil 
      ? new Date(budgetData.validUntil)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [quotation] = await db("quotations")
      .insert({
        budget_id: budgetId,
        title: value.title,
        client_name: value.client_name,
        client_email: value.client_email,
        client_phone: value.client_phone,
        client_document: value.client_document || null,
        type: value.type,
        category: budgetData.category || null,
        main_category: budgetData.mainCategory || budgetData.main_category || null,
        description: budgetData.description || null,
        notes: budgetData.notes || null,
        subtotal: subtotal,
        discount: discount,
        discount_type: budgetData.discountType || null,
        taxes: taxes,
        tax_type: budgetData.taxType || null,
        total: total,
        currency: budgetData.currency || "BRL",
        status: budgetData.status || "draft",
        valid_until: validUntil,
        expires_at: budgetData.expiresAt ? new Date(budgetData.expiresAt) : validUntil,
        budget_data: JSON.stringify({
          ...budgetData,
          id: budgetId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        version: budgetData.version || 1,
        tags: budgetData.tags ? JSON.stringify(budgetData.tags) : null,
        created_by: req.user.id,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning("*");

    // Parsear budget_data para retorno
    const budgetDataReturn = typeof quotation.budget_data === 'string' 
      ? JSON.parse(quotation.budget_data) 
      : quotation.budget_data;

    res.status(201).json({
      id: quotation.budget_id,
      ...budgetDataReturn,
    });
  } catch (error) {
    logger.error('Erro ao criar cotação', { body: req.body, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * PUT /api/rsv360/quotations/:id
 * Atualizar cotação
 */
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateQuotationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: "Dados inválidos", 
        details: error.details.map(d => d.message) 
      });
    }

    // Buscar cotação existente
    const existing = await db("quotations")
      .where("budget_id", id)
      .first();

    if (!existing) {
      return res.status(404).json({ error: "Cotação não encontrada" });
    }

    // Parsear budget_data existente
    let budgetData = typeof existing.budget_data === 'string' 
      ? JSON.parse(existing.budget_data) 
      : existing.budget_data;

    // Mesclar com novos dados
    if (value.budget_data) {
      budgetData = { ...budgetData, ...value.budget_data };
    }

    // Atualizar campos específicos se fornecidos
    const updateData = {};
    if (value.title) updateData.title = value.title;
    if (value.client_name) updateData.client_name = value.client_name;
    if (value.client_email) updateData.client_email = value.client_email;
    if (value.client_phone) updateData.client_phone = value.client_phone;
    if (value.status) updateData.status = value.status;
    if (value.valid_until) updateData.valid_until = new Date(value.valid_until);

    // Recalcular valores se necessário
    if (value.budget_data) {
      updateData.subtotal = budgetData.subtotal || 0;
      updateData.discount = budgetData.discount || 0;
      updateData.taxes = budgetData.taxes || 0;
      updateData.total = (budgetData.subtotal || 0) - (budgetData.discount || 0) + (budgetData.taxes || 0);
    }

    // Atualizar budget_data
    budgetData.updatedAt = new Date().toISOString();
    updateData.budget_data = JSON.stringify(budgetData);
    updateData.updated_at = db.fn.now();

    const [quotation] = await db("quotations")
      .where("budget_id", id)
      .update(updateData)
      .returning("*");

    // Parsear budget_data para retorno
    const budgetDataReturn = typeof quotation.budget_data === 'string' 
      ? JSON.parse(quotation.budget_data) 
      : quotation.budget_data;

    res.json({
      id: quotation.budget_id,
      ...budgetDataReturn,
    });
  } catch (error) {
    logger.error('Erro ao atualizar cotação', { id: req.params.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * DELETE /api/rsv360/quotations/:id
 * Deletar cotação
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await db("quotations")
      .where("budget_id", id)
      .del();

    if (deleted === 0) {
      return res.status(404).json({ error: "Cotação não encontrada" });
    }

    res.json({ message: "Cotação deletada com sucesso" });
  } catch (error) {
    logger.error('Erro ao deletar cotação', { id: req.params.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * GET /api/rsv360/quotations/stats
 * Obter estatísticas de cotações
 */
router.get("/stats", authenticate, async (req, res) => {
  try {
    const [total] = await db("quotations")
      .count("* as count")
      .first();

    const [totalValue] = await db("quotations")
      .sum("total as total")
      .first();

    const [approved] = await db("quotations")
      .where("status", "approved")
      .count("* as count")
      .first();

    const [pending] = await db("quotations")
      .where("status", "sent")
      .count("* as count")
      .first();

    const [rejected] = await db("quotations")
      .where("status", "rejected")
      .count("* as count")
      .first();

    const [draft] = await db("quotations")
      .where("status", "draft")
      .count("* as count")
      .first();

    res.json({
      total: parseInt(total?.count || 0),
      totalValue: parseFloat(totalValue?.total || 0),
      approved: parseInt(approved?.count || 0),
      pending: parseInt(pending?.count || 0),
      rejected: parseInt(rejected?.count || 0),
      draft: parseInt(draft?.count || 0),
    });
  } catch (error) {
    logger.error('Erro ao obter estatísticas de cotações', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

module.exports = router;

