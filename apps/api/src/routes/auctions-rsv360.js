/**
 * 🎯 Rotas RSV360 - Leilões de Hospedagem
 * FASE: Rotas completas para sistema de leilões
 */

const express = require("express");
const Joi = require("joi");
const router = express.Router();
const auctionService = require("../services/auctionService");
const paymentService = require("../services/paymentService");
const { advancedJWTValidation, requireRole } = require("../middleware/advancedAuth");
const { propertiesRateLimiter } = require("../middleware/rateLimiter");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ service: 'auctionRoutes' });
const authenticate = advancedJWTValidation;

// Aplicar rate limiting
router.use(propertiesRateLimiter);

// Schemas de validação
const createAuctionSchema = Joi.object({
  property_id: Joi.number().integer().required(),
  start_price: Joi.number().positive().required(),
  min_increment: Joi.number().positive().optional().default(10.0),
  start_time: Joi.date().iso().required(),
  end_time: Joi.date().iso().required(),
  check_in: Joi.date().iso().required(),
  check_out: Joi.date().iso().required(),
  max_guests: Joi.number().integer().positive().required(),
  description: Joi.string().optional().allow(null, ''),
});

const createBidSchema = Joi.object({
  amount: Joi.number().positive().required(),
  is_auto_bid: Joi.boolean().optional().default(false),
  max_amount: Joi.number().positive().optional(),
});

const paymentSchema = Joi.object({
  payment_method: Joi.string().valid('credit_card', 'pix', 'debit', 'paypal').required(),
  card_data: Joi.object({
    number: Joi.string().required(),
    expiry: Joi.string().required(),
    cvv: Joi.string().required(),
    name: Joi.string().required(),
    installments: Joi.number().integer().optional(),
  }).optional(),
  pix_data: Joi.object({
    cpf: Joi.string().optional(),
    email: Joi.string().email().optional(),
  }).optional(),
});

/**
 * GET /api/rsv360/auctions
 * Listar leilões com filtros
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      city: req.query.city,
      state: req.query.state,
      min_price: req.query.min_price ? parseFloat(req.query.min_price) : undefined,
      max_price: req.query.max_price ? parseFloat(req.query.max_price) : undefined,
      check_in: req.query.check_in,
      check_out: req.query.check_out,
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 20,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order,
    };

    const result = await auctionService.getAuctions(filters);
    res.json(result);
  } catch (error) {
    logger.error('Erro ao listar leilões', { error: error.message });
    res.status(500).json({
      error: "Erro ao listar leilões",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/auctions/:id
 * Obter leilão específico
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const auction = await auctionService.getAuctionById(id, req.user.id);

    if (!auction) {
      return res.status(404).json({ error: "Leilão não encontrado" });
    }

    res.json(auction);
  } catch (error) {
    logger.error('Erro ao obter leilão', { id: req.params.id, error: error.message });
    res.status(500).json({
      error: "Erro ao obter leilão",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/auctions
 * Criar novo leilão (host)
 */
router.post("/", authenticate, requireRole(['host', 'admin']), async (req, res) => {
  try {
    const { error, value } = createAuctionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const auction = await auctionService.createAuction(req.user.id, value);
    res.status(201).json(auction);
  } catch (error) {
    logger.error('Erro ao criar leilão', { userId: req.user.id, error: error.message });
    res.status(500).json({
      error: "Erro ao criar leilão",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/auctions/:id/bids
 * Obter lances de um leilão
 */
router.get("/:id/bids", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const bids = await auctionService.getAuctionBids(id);
    res.json(bids);
  } catch (error) {
    logger.error('Erro ao buscar lances', { id: req.params.id, error: error.message });
    res.status(500).json({
      error: "Erro ao buscar lances",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/auctions/:id/bids
 * Criar lance em um leilão
 */
router.post("/:id/bids", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = createBidSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    await auctionService.createBid(id, req.user.id, value);
    const bids = await auctionService.getAuctionBids(id);
    res.status(201).json(bids);
  } catch (error) {
    logger.error('Erro ao criar lance', {
      id: req.params.id,
      userId: req.user.id,
      error: error.message,
    });
    res.status(400).json({
      error: "Erro ao criar lance",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/auctions/:id/payment-status
 * Verificar status de pagamento
 */
router.get("/:id/payment-status", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const status = await auctionService.checkPaymentStatus(id, req.user.id);
    res.json(status);
  } catch (error) {
    logger.error('Erro ao verificar status de pagamento', {
      id: req.params.id,
      userId: req.user.id,
      error: error.message,
    });
    res.status(500).json({
      error: "Erro ao verificar status de pagamento",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/auctions/:id/payment
 * Processar pagamento após vencer leilão
 */
router.post("/:id/payment", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = paymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    // Verificar se usuário é vencedor
    const auction = await auctionService.getAuctionById(id, req.user.id);
    if (!auction) {
      return res.status(404).json({ error: "Leilão não encontrado" });
    }
    if (auction.winner_id !== req.user.id) {
      return res.status(403).json({ error: "Você não é o vencedor deste leilão" });
    }
    if (auction.status !== "ended") {
      return res.status(400).json({ error: "Leilão ainda não terminou" });
    }
    if (auction.payment_completed) {
      return res.status(400).json({ error: "Pagamento já foi processado" });
    }

    // Criar booking usando bookingService (garante estrutura correta)
    const bookingService = require("../services/bookingService");
    
    // Criar booking com estrutura correta
    const booking = await bookingService.createBookingWithLocking({
      user_id: req.user.id,
      customer_id: req.user.id, // Assumindo que user_id é o customer_id
      property_id: auction.property_id,
      check_in: auction.check_in,
      check_out: auction.check_out,
      guests_count: auction.max_guests,
      metadata: {
        auction_id: id,
        source: "auction",
      },
    });

    // Processar pagamento usando paymentService
    const paymentResult = await paymentService.processPayment({
      booking_id: booking.id,
      user_id: req.user.id,
      amount: auction.current_bid,
      currency: "BRL",
      payment_method: value.payment_method,
      card_data: value.card_data,
      pix_data: value.pix_data,
      metadata: {
        auction_id: id,
        property_id: auction.property_id,
        check_in: auction.check_in,
        check_out: auction.check_out,
        type: 'auction',
      },
    });

    // Atualizar leilão como pago
    await db("auctions")
      .where("id", id)
      .update({
        payment_completed: true,
        updated_at: new Date(),
      });

    res.json({
      success: true,
      payment_id: paymentResult.id?.toString() || paymentResult.payment_id,
      booking_id: booking.id.toString(),
      message: "Pagamento processado com sucesso",
    });
  } catch (error) {
    logger.error('Erro ao processar pagamento', {
      id: req.params.id,
      userId: req.user.id,
      error: error.message,
    });
    res.status(500).json({
      error: "Erro ao processar pagamento",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/auctions/:id/payment/cancel
 * Cancelar pagamento (desistir do leilão)
 */
router.post("/:id/payment/cancel", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se usuário é vencedor
    const auction = await auctionService.getAuctionById(id, req.user.id);
    if (!auction) {
      return res.status(404).json({ error: "Leilão não encontrado" });
    }
    if (auction.winner_id !== req.user.id) {
      return res.status(403).json({ error: "Você não é o vencedor deste leilão" });
    }
    if (auction.payment_completed) {
      return res.status(400).json({ error: "Pagamento já foi processado, não pode ser cancelado" });
    }

    // Remover vencedor e permitir que o segundo colocado seja o vencedor
    const { db } = require("../config/database");
    const secondBid = await db("auction_bids")
      .where("auction_id", id)
      .where("user_id", "!=", req.user.id)
      .orderBy("amount", "desc")
      .first();

    if (secondBid) {
      await db("auctions")
        .where("id", id)
        .update({
          winner_id: secondBid.user_id,
          current_bid: secondBid.amount,
          payment_deadline: new Date(Date.now() + 5 * 60 * 1000), // 5 minutos
          updated_at: new Date(),
        });

      // Atualizar lance vencedor
      await db("auction_bids")
        .where("id", secondBid.id)
        .update({ is_winning_bid: true });
    } else {
      // Se não há segundo lance, cancelar leilão
      await db("auctions")
        .where("id", id)
        .update({
          winner_id: null,
          status: "cancelled",
          updated_at: new Date(),
        });
    }

    res.json({
      success: true,
      message: "Pagamento cancelado. Leilão atualizado.",
    });
  } catch (error) {
    logger.error('Erro ao cancelar pagamento', {
      id: req.params.id,
      userId: req.user.id,
      error: error.message,
    });
    res.status(500).json({
      error: "Erro ao cancelar pagamento",
      message: error.message,
    });
  }
});

module.exports = router;

