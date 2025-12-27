/**
 * 📋 Rotas RSV360 - Wishlists Compartilhadas
 * FASE 2.1.8: Rotas de Group Travel - Wishlists
 */

const express = require("express");
const router = express.Router();
const wishlistService = require("../group-travel/services/wishlist-service");
const voteService = require("../group-travel/services/vote-service");
const {
  createWishlistSchema,
  updateWishlistSchema,
  addItemSchema,
  addMemberSchema,
  voteSchema,
} = require("../group-travel/validators/wishlist-validator");
const { advancedJWTValidation } = require("../middleware/advancedAuth");
const { propertiesRateLimiter } = require("../middleware/rateLimiter");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ service: 'wishlistRoutes' });
const authenticate = advancedJWTValidation;

// Aplicar rate limiting
router.use(propertiesRateLimiter);

/**
 * GET /api/rsv360/wishlists
 * Listar wishlists do usuário
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const wishlists = await wishlistService.getUserWishlists(req.user.id);

    res.json({
      success: true,
      wishlists,
      count: wishlists.length,
    });
  } catch (error) {
    logger.error('Erro ao listar wishlists', { error: error.message });
    res.status(500).json({
      error: "Erro ao listar wishlists",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/wishlists
 * Criar nova wishlist
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const { error, value } = createWishlistSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const { name, member_emails } = value;
    const wishlist = await wishlistService.createWishlist(
      req.user.id,
      name,
      member_emails || []
    );

    res.status(201).json({
      success: true,
      wishlist,
    });
  } catch (error) {
    logger.error('Erro ao criar wishlist', { error: error.message });
    res.status(500).json({
      error: "Erro ao criar wishlist",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/wishlists/:id
 * Obter wishlist com membros e itens
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const wishlist = await wishlistService.getWishlist(parseInt(id), req.user.id);

    res.json({
      success: true,
      wishlist,
    });
  } catch (error) {
    logger.error('Erro ao obter wishlist', { error: error.message });
    const status = error.message.includes("não tem acesso") ? 403 : 500;
    res.status(status).json({
      error: "Erro ao obter wishlist",
      message: error.message,
    });
  }
});

/**
 * DELETE /api/rsv360/wishlists/:id
 * Deletar wishlist
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await wishlistService.deleteWishlist(parseInt(id), req.user.id);

    res.json({
      success: true,
      message: "Wishlist deletada com sucesso",
    });
  } catch (error) {
    logger.error('Erro ao deletar wishlist', { error: error.message });
    const status = error.message.includes("permissão") ? 403 : 500;
    res.status(status).json({
      error: "Erro ao deletar wishlist",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/wishlists/:id/items
 * Adicionar item à wishlist
 */
router.post("/:id/items", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = addItemSchema.validate({
      ...req.body,
      wishlist_id: parseInt(id),
    });

    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const { property_id, notes } = value;
    const item = await wishlistService.addItem(parseInt(id), req.user.id, property_id, notes);

    res.status(201).json({
      success: true,
      item,
    });
  } catch (error) {
    logger.error('Erro ao adicionar item', { error: error.message });
    const status = error.message.includes("não tem") ? 403 : 500;
    res.status(status).json({
      error: "Erro ao adicionar item",
      message: error.message,
    });
  }
});

/**
 * DELETE /api/rsv360/wishlists/:id/items/:itemId
 * Remover item da wishlist
 */
router.delete("/:id/items/:itemId", authenticate, async (req, res) => {
  try {
    const { id, itemId } = req.params;
    await wishlistService.removeItem(parseInt(id), parseInt(itemId), req.user.id);

    res.json({
      success: true,
      message: "Item removido com sucesso",
    });
  } catch (error) {
    logger.error('Erro ao remover item', { error: error.message });
    const status = error.message.includes("permissão") ? 403 : 500;
    res.status(status).json({
      error: "Erro ao remover item",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/wishlists/:id/members
 * Adicionar membro à wishlist
 */
router.post("/:id/members", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = addMemberSchema.validate({
      ...req.body,
      wishlist_id: parseInt(id),
    });

    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const { email, role } = value;
    await wishlistService.addMember(parseInt(id), req.user.id, email, role);

    res.status(201).json({
      success: true,
      message: "Membro adicionado com sucesso",
    });
  } catch (error) {
    logger.error('Erro ao adicionar membro', { error: error.message });
    const status = error.message.includes("não tem") ? 403 : 500;
    res.status(status).json({
      error: "Erro ao adicionar membro",
      message: error.message,
    });
  }
});

/**
 * DELETE /api/rsv360/wishlists/:id/members/:memberId
 * Remover membro da wishlist
 */
router.delete("/:id/members/:memberId", authenticate, async (req, res) => {
  try {
    const { id, memberId } = req.params;
    await wishlistService.removeMember(parseInt(id), req.user.id, parseInt(memberId));

    res.json({
      success: true,
      message: "Membro removido com sucesso",
    });
  } catch (error) {
    logger.error('Erro ao remover membro', { error: error.message });
    const status = error.message.includes("permissão") ? 403 : 500;
    res.status(status).json({
      error: "Erro ao remover membro",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/wishlists/items/:itemId/vote
 * Votar em um item
 */
router.post("/items/:itemId/vote", authenticate, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { error, value } = voteSchema.validate({
      ...req.body,
      item_id: parseInt(itemId),
    });

    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const { vote } = value;
    const voteRecord = await voteService.vote(req.user.id, parseInt(itemId), vote);

    res.json({
      success: true,
      vote: voteRecord,
      message: voteRecord ? "Voto registrado" : "Voto removido",
    });
  } catch (error) {
    logger.error('Erro ao votar', { error: error.message });
    const status = error.message.includes("Limite") ? 429 : 500;
    res.status(status).json({
      error: "Erro ao votar",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/wishlists/items/:itemId/votes
 * Obter votos de um item
 */
router.get("/items/:itemId/votes", authenticate, async (req, res) => {
  try {
    const { itemId } = req.params;
    const votes = await voteService.getItemVotes(parseInt(itemId));
    const stats = await voteService.getVotesStats(parseInt(itemId));

    res.json({
      success: true,
      votes,
      stats,
      count: votes.length,
    });
  } catch (error) {
    logger.error('Erro ao obter votos', { error: error.message });
    res.status(500).json({
      error: "Erro ao obter votos",
      message: error.message,
    });
  }
});

module.exports = router;

