/**
 * 📢 Marketing API Routes
 * FASE: Rotas para campanhas de marketing completas
 */

const express = require("express");
const Joi = require("joi");
const router = express.Router();
const { db } = require("../config/database");
const { advancedJWTValidation, requireRole } = require("../middleware/advancedAuth");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ service: 'marketingRoutes' });
const authenticate = advancedJWTValidation;

// Schema de validação
const createCampaignSchema = Joi.object({
  name: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(1000).optional(),
  type: Joi.string().valid("email", "social", "ads", "content", "influencer", "SEO").required(),
  status: Joi.string().valid("active", "paused", "completed", "draft", "scheduled").optional(),
  budget: Joi.number().min(0).optional(),
  spent: Joi.number().min(0).optional(),
  impressions: Joi.number().integer().min(0).optional(),
  clicks: Joi.number().integer().min(0).optional(),
  conversions: Joi.number().integer().min(0).optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
  target_audience: Joi.string().max(200).optional(),
  platform: Joi.string().max(100).optional(),
  content_type: Joi.string().max(100).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  metadata: Joi.object().optional(),
});

const updateCampaignSchema = Joi.object({
  name: Joi.string().min(3).max(200).optional(),
  description: Joi.string().max(1000).optional(),
  status: Joi.string().valid("active", "paused", "completed", "draft", "scheduled").optional(),
  budget: Joi.number().min(0).optional(),
  spent: Joi.number().min(0).optional(),
  impressions: Joi.number().integer().min(0).optional(),
  clicks: Joi.number().integer().min(0).optional(),
  conversions: Joi.number().integer().min(0).optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
  target_audience: Joi.string().max(200).optional(),
  platform: Joi.string().max(100).optional(),
  content_type: Joi.string().max(100).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  metadata: Joi.object().optional(),
});

/**
 * GET /api/rsv360/marketing/campaigns
 * Listar campanhas de marketing
 */
router.get("/campaigns", authenticate, async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20, search } = req.query;

    let query = db("marketing_campaigns");

    if (type && type !== 'all') {
      query = query.where("type", type);
    }

    if (status && status !== 'all') {
      query = query.where("status", status);
    }

    if (search) {
      query = query.where(function() {
        this.where("name", "ilike", `%${search}%`)
            .orWhere("description", "ilike", `%${search}%`)
            .orWhere("target_audience", "ilike", `%${search}%`);
      });
    }

    // Contar total
    const totalQuery = query.clone();
    const [{ count }] = await totalQuery.count("* as count");
    const total = parseInt(count);

    // Paginação
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const campaigns = await query
      .orderBy("created_at", "desc")
      .limit(parseInt(limit))
      .offset(offset);

    // Calcular métricas derivadas
    const campaignsWithMetrics = campaigns.map(campaign => {
      const roi = campaign.spent > 0 
        ? ((campaign.conversions * 100 - campaign.spent) / campaign.spent * 100) 
        : 0;
      const ctr = campaign.impressions > 0 
        ? (campaign.clicks / campaign.impressions * 100) 
        : 0;
      const cpc = campaign.clicks > 0 
        ? (campaign.spent / campaign.clicks) 
        : 0;
      const engagement_rate = campaign.reach > 0 
        ? (campaign.clicks / campaign.reach * 100) 
        : 0;

      return {
        ...campaign,
        tags: typeof campaign.tags === 'string' ? JSON.parse(campaign.tags || '[]') : (campaign.tags || []),
        metadata: typeof campaign.metadata === 'string' ? JSON.parse(campaign.metadata || '{}') : (campaign.metadata || {}),
        roi: parseFloat(roi.toFixed(2)),
        ctr: parseFloat(ctr.toFixed(2)),
        cpc: parseFloat(cpc.toFixed(2)),
        engagement_rate: parseFloat(engagement_rate.toFixed(2)),
      };
    });

    res.json({
      campaigns: campaignsWithMetrics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Erro ao listar campanhas de marketing', { error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * GET /api/rsv360/marketing/campaigns/:id
 * Obter campanha específica
 */
router.get("/campaigns/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await db("marketing_campaigns")
      .where({ id: parseInt(id) })
      .first();

    if (!campaign) {
      return res.status(404).json({ error: "Campanha não encontrada" });
    }

    // Calcular métricas
    const roi = campaign.spent > 0 
      ? ((campaign.conversions * 100 - campaign.spent) / campaign.spent * 100) 
      : 0;
    const ctr = campaign.impressions > 0 
      ? (campaign.clicks / campaign.impressions * 100) 
      : 0;
    const cpc = campaign.clicks > 0 
      ? (campaign.spent / campaign.clicks) 
      : 0;
    const engagement_rate = campaign.reach > 0 
      ? (campaign.clicks / campaign.reach * 100) 
      : 0;

    const campaignWithMetrics = {
      ...campaign,
      tags: typeof campaign.tags === 'string' ? JSON.parse(campaign.tags || '[]') : (campaign.tags || []),
      metadata: typeof campaign.metadata === 'string' ? JSON.parse(campaign.metadata || '{}') : (campaign.metadata || {}),
      roi: parseFloat(roi.toFixed(2)),
      ctr: parseFloat(ctr.toFixed(2)),
      cpc: parseFloat(cpc.toFixed(2)),
      engagement_rate: parseFloat(engagement_rate.toFixed(2)),
    };

    res.json(campaignWithMetrics);
  } catch (error) {
    logger.error('Erro ao obter campanha', { id: req.params.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * POST /api/rsv360/marketing/campaigns
 * Criar nova campanha (apenas admin/marketing)
 */
router.post("/campaigns", authenticate, requireRole(['admin', 'marketing']), async (req, res) => {
  try {
    const { error, value } = createCampaignSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: "Dados inválidos", 
        details: error.details.map(d => d.message) 
      });
    }

    const [campaign] = await db("marketing_campaigns")
      .insert({
        ...value,
        created_by: req.user.id,
        tags: value.tags ? JSON.stringify(value.tags) : null,
        metadata: value.metadata ? JSON.stringify(value.metadata) : null,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning("*");

    // Parse JSON fields
    const campaignWithParsedFields = {
      ...campaign,
      tags: typeof campaign.tags === 'string' ? JSON.parse(campaign.tags || '[]') : (campaign.tags || []),
      metadata: typeof campaign.metadata === 'string' ? JSON.parse(campaign.metadata || '{}') : (campaign.metadata || {}),
    };

    res.status(201).json(campaignWithParsedFields);
  } catch (error) {
    logger.error('Erro ao criar campanha', { body: req.body, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * PUT /api/rsv360/marketing/campaigns/:id
 * Atualizar campanha (apenas admin/marketing)
 */
router.put("/campaigns/:id", authenticate, requireRole(['admin', 'marketing']), async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateCampaignSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: "Dados inválidos", 
        details: error.details.map(d => d.message) 
      });
    }

    const updateData = { ...value };
    if (updateData.tags) {
      updateData.tags = JSON.stringify(updateData.tags);
    }
    if (updateData.metadata) {
      updateData.metadata = JSON.stringify(updateData.metadata);
    }
    updateData.updated_at = db.fn.now();

    const [campaign] = await db("marketing_campaigns")
      .where({ id: parseInt(id) })
      .update(updateData)
      .returning("*");

    if (!campaign) {
      return res.status(404).json({ error: "Campanha não encontrada" });
    }

    // Parse JSON fields
    const campaignWithParsedFields = {
      ...campaign,
      tags: typeof campaign.tags === 'string' ? JSON.parse(campaign.tags || '[]') : (campaign.tags || []),
      metadata: typeof campaign.metadata === 'string' ? JSON.parse(campaign.metadata || '{}') : (campaign.metadata || {}),
    };

    res.json(campaignWithParsedFields);
  } catch (error) {
    logger.error('Erro ao atualizar campanha', { id: req.params.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * DELETE /api/rsv360/marketing/campaigns/:id
 * Deletar campanha (apenas admin/marketing)
 */
router.delete("/campaigns/:id", authenticate, requireRole(['admin', 'marketing']), async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await db("marketing_campaigns")
      .where({ id: parseInt(id) })
      .del();

    if (deleted === 0) {
      return res.status(404).json({ error: "Campanha não encontrada" });
    }

    res.json({ message: "Campanha deletada com sucesso" });
  } catch (error) {
    logger.error('Erro ao deletar campanha', { id: req.params.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * GET /api/rsv360/marketing/metrics
 * Obter métricas agregadas de marketing
 */
router.get("/metrics", authenticate, requireRole(['admin', 'marketing']), async (req, res) => {
  try {
    const [totalBudget] = await db("marketing_campaigns")
      .sum("budget as total")
      .first();

    const [totalSpent] = await db("marketing_campaigns")
      .sum("spent as total")
      .first();

    const [totalImpressions] = await db("marketing_campaigns")
      .sum("impressions as total")
      .first();

    const [totalConversions] = await db("marketing_campaigns")
      .sum("conversions as total")
      .first();

    const [avgROI] = await db("marketing_campaigns")
      .where("spent", ">", 0)
      .avg(db.raw("(conversions * 100 - spent) / spent * 100 as roi"))
      .first();

    const [avgEngagement] = await db("marketing_campaigns")
      .where("reach", ">", 0)
      .avg(db.raw("clicks / reach * 100 as engagement"))
      .first();

    res.json({
      totalBudget: parseFloat(totalBudget?.total || 0),
      totalSpent: parseFloat(totalSpent?.total || 0),
      totalImpressions: parseInt(totalImpressions?.total || 0),
      totalConversions: parseInt(totalConversions?.total || 0),
      avgROI: parseFloat(avgROI?.roi || 0),
      avgEngagement: parseFloat(avgEngagement?.engagement || 0),
    });
  } catch (error) {
    logger.error('Erro ao obter métricas de marketing', { error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

module.exports = router;

