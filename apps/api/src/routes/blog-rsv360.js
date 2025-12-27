/**
 * 📝 Blog API Routes
 * FASE: Rotas para gerenciamento de blog
 */

const express = require("express");
const Joi = require("joi");
const router = express.Router();
const { db } = require("../config/database");
const { advancedJWTValidation, requireRole } = require("../middleware/advancedAuth");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ service: 'blogRoutes' });
const authenticate = advancedJWTValidation;

// Schemas de validação
const createPostSchema = Joi.object({
  slug: Joi.string().min(1).max(200).required(),
  title: Joi.string().min(1).max(200).required(),
  excerpt: Joi.string().max(500).optional(),
  content: Joi.string().min(1).required(),
  author: Joi.string().max(100).optional(),
  image_url: Joi.string().uri().optional().allow(null, ''),
  published: Joi.boolean().optional(),
  published_at: Joi.date().iso().optional(),
  meta_title: Joi.string().max(200).optional(),
  meta_description: Joi.string().max(500).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

const updatePostSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  excerpt: Joi.string().max(500).optional(),
  content: Joi.string().min(1).optional(),
  author: Joi.string().max(100).optional(),
  image_url: Joi.string().uri().optional().allow(null, ''),
  published: Joi.boolean().optional(),
  published_at: Joi.date().iso().optional(),
  meta_title: Joi.string().max(200).optional(),
  meta_description: Joi.string().max(500).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

/**
 * GET /api/rsv360/blog
 * Listar posts do blog (público - apenas publicados)
 */
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    let query = db("blog_posts")
      .where("published", true)
      .where("published_at", "<=", db.fn.now());

    // Busca por texto
    if (search) {
      query = query.where(function() {
        this.where("title", "ilike", `%${search}%`)
            .orWhere("excerpt", "ilike", `%${search}%`)
            .orWhere("content", "ilike", `%${search}%`);
      });
    }

    // Contar total
    const totalQuery = query.clone();
    const [{ count }] = await totalQuery.count("* as count");
    const total = parseInt(count);

    // Paginação
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const posts = await query
      .orderBy("published_at", "desc")
      .limit(parseInt(limit))
      .offset(offset);

    // Parse JSON tags
    const postsWithParsedTags = posts.map(post => ({
      ...post,
      tags: typeof post.tags === 'string' ? JSON.parse(post.tags || '[]') : (post.tags || []),
    }));

    res.json({
      posts: postsWithParsedTags,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Erro ao listar posts do blog', { error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * GET /api/rsv360/blog/:slug
 * Obter post específico por slug (público)
 */
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const post = await db("blog_posts")
      .where({ slug, published: true })
      .where("published_at", "<=", db.fn.now())
      .first();

    if (!post) {
      return res.status(404).json({ error: "Post não encontrado" });
    }

    // Incrementar views
    await db("blog_posts")
      .where({ id: post.id })
      .increment("views", 1);

    // Parse JSON tags
    const postWithParsedTags = {
      ...post,
      tags: typeof post.tags === 'string' ? JSON.parse(post.tags || '[]') : (post.tags || []),
    };

    res.json(postWithParsedTags);
  } catch (error) {
    logger.error('Erro ao obter post do blog', { slug: req.params.slug, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * POST /api/rsv360/blog
 * Criar novo post (apenas admin)
 */
router.post("/", authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { error, value } = createPostSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: "Dados inválidos", 
        details: error.details.map(d => d.message) 
      });
    }

    // Verificar se slug já existe
    const existing = await db("blog_posts").where({ slug: value.slug }).first();
    if (existing) {
      return res.status(400).json({ error: "Slug já existe" });
    }

    const [post] = await db("blog_posts")
      .insert({
        ...value,
        author_id: req.user.id,
        tags: value.tags ? JSON.stringify(value.tags) : null,
        published_at: value.published && !value.published_at ? db.fn.now() : value.published_at,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning("*");

    // Parse JSON tags
    const postWithParsedTags = {
      ...post,
      tags: typeof post.tags === 'string' ? JSON.parse(post.tags || '[]') : (post.tags || []),
    };

    res.status(201).json(postWithParsedTags);
  } catch (error) {
    logger.error('Erro ao criar post do blog', { body: req.body, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * PUT /api/rsv360/blog/:id
 * Atualizar post (apenas admin)
 */
router.put("/:id", authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updatePostSchema.validate(req.body);
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
    updateData.updated_at = db.fn.now();

    const [post] = await db("blog_posts")
      .where({ id: parseInt(id) })
      .update(updateData)
      .returning("*");

    if (!post) {
      return res.status(404).json({ error: "Post não encontrado" });
    }

    // Parse JSON tags
    const postWithParsedTags = {
      ...post,
      tags: typeof post.tags === 'string' ? JSON.parse(post.tags || '[]') : (post.tags || []),
    };

    res.json(postWithParsedTags);
  } catch (error) {
    logger.error('Erro ao atualizar post do blog', { id: req.params.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * DELETE /api/rsv360/blog/:id
 * Deletar post (apenas admin)
 */
router.delete("/:id", authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await db("blog_posts")
      .where({ id: parseInt(id) })
      .del();

    if (deleted === 0) {
      return res.status(404).json({ error: "Post não encontrado" });
    }

    res.json({ message: "Post deletado com sucesso" });
  } catch (error) {
    logger.error('Erro ao deletar post do blog', { id: req.params.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

module.exports = router;

