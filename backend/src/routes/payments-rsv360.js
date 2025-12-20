/**
 * 💳 Rotas RSV360 - Payments
 * FASE 3.3: Rotas de pagamentos com split e chargeback
 * Suporta múltiplos gateways e divisão de pagamentos
 */

const express = require("express");
const Joi = require("joi");
const router = express.Router();
const { db } = require("../config/database");
const paymentService = require("../services/paymentService");
const { createCircuitBreaker, executeWithBreaker } = require("../patterns/circuitBreaker");
const notificationService = require("../services/notificationService");
const { advancedJWTValidation, requireRole, requireOwnership } = require("../middleware/advancedAuth");
const {
  validateWebhookSignature,
  getWebhookSecret,
} = require("../services/webhookValidationService");
const { getPaymentUserId } = require("../middleware/ownershipHelpers");
// FASE B3.3: Integrar Factory Pattern para gateways
const { createGateway, isGatewaySupported } = require("../services/paymentGatewayFactory");
// FASE C7: Rate limiting específico
const { paymentsRateLimiter } = require("../middleware/rateLimiter");

// Usar advancedAuth (FASE 4)
const authenticate = advancedJWTValidation;

// FASE C7: Aplicar rate limiting em todas as rotas de payments
router.use(paymentsRateLimiter);

// Schema de validação para criação de pagamento
const createPaymentSchema = Joi.object({
  booking_id: Joi.number().integer().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().default("BRL"),
  payment_method: Joi.string()
    .valid("credit_card", "debit_card", "pix", "boleto")
    .required(),
  gateway: Joi.string()
    .valid("stripe", "mercado_pago", "nubank", "c6", "banco_inter")
    .default("stripe"),
  card_data: Joi.object({
    number: Joi.string().required(),
    exp_month: Joi.number().integer().min(1).max(12).required(),
    exp_year: Joi.number().integer().min(new Date().getFullYear()).required(),
    cvv: Joi.string().length(3).required(),
    holder_name: Joi.string().required(),
  }).when("payment_method", {
    is: Joi.string().valid("credit_card", "debit_card"),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  splits: Joi.array()
    .items(
      Joi.object({
        recipient_id: Joi.number().integer().required(),
        amount: Joi.number().positive().optional(),
        percentage: Joi.number().min(0).max(100).optional(),
        split_type: Joi.string().valid("percentage", "fixed_amount").required(),
      }),
    )
    .optional(),
  metadata: Joi.object().optional(),
});

/**
 * POST /api/rsv360/payments
 * Criar pagamento (com suporte a split)
 */
router.post("/", authenticate, async (req, res) => {
  try {
    // Validar dados
    const { error, value } = createPaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const {
      booking_id,
      amount,
      currency,
      payment_method,
      gateway,
      card_data,
      splits,
      metadata,
    } = value;

    // Verificar se booking existe
    const booking = await db("bookings").where("id", booking_id).first();
    if (!booking) {
      return res.status(404).json({ error: "Reserva não encontrada" });
    }

    // Processar pagamento usando service
    const payment = await paymentService.processPayment({
      booking_id,
      user_id: req.user?.id || 1,
      amount,
      currency,
      payment_method,
      gateway,
      card_data,
      splits,
      metadata,
    });

    res.status(201).json({
      success: true,
      payment: {
        id: payment.id,
        booking_id: payment.booking_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        transaction_id: payment.transaction_id,
        gateway: payment.gateway_provider,
      },
      message: "Pagamento criado com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao criar pagamento:", error);

    // FASE B3.5: Tratamento de erros específicos de cada gateway
    if (error.message.includes("GATEWAY_NAO_SUPORTADO")) {
      return res.status(400).json({
        error: "Gateway não suportado",
        message: error.message,
      });
    }

    if (error.message.includes("CARTAO_RECUSADO") || error.message.includes("VALOR_MINIMO")) {
      return res.status(400).json({
        error: "Erro no pagamento",
        message: error.message,
        code: error.message.split(':')[0],
      });
    }

    if (error.message.includes("RATE_LIMIT") || error.message.includes("ERRO_API")) {
      return res.status(503).json({
        error: "Serviço de pagamento temporariamente indisponível",
        message: error.message,
        code: error.message.split(':')[0],
      });
    }

    if (error.message.includes("não encontrada") || error.message.includes("não pode exceder")) {
      return res.status(400).json({
        error: error.message,
      });
    }

    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/payments
 * Listar pagamentos com filtros
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const {
      booking_id,
      status,
      gateway,
      page = 1,
      limit = 20,
    } = req.query;

    // Buscar pagamentos usando service
    const result = await paymentService.searchPayments({
      booking_id,
      status,
      gateway,
      page,
      limit,
    });

    res.json({
      success: true,
      payments: result.payments,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("❌ Erro ao listar pagamentos:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/payments/:id
 * Obter pagamento específico com splits
 */
router.get("/:id", authenticate, requireOwnership(getPaymentUserId), async (req, res) => {
  try {
    const { id } = req.params;

    // Obter pagamento usando service
    const payment = await paymentService.getPaymentById(parseInt(id), true);

    if (!payment) {
      return res.status(404).json({
        error: "Pagamento não encontrado",
      });
    }

    res.json({
      success: true,
      payment: {
        ...payment,
        splits: payment.splits || [],
      },
    });
  } catch (error) {
    console.error("❌ Erro ao obter pagamento:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/payments/:id/confirm
 * Confirmar pagamento (webhook ou manual)
 */
router.post("/:id/confirm", authenticate, requireOwnership(getPaymentUserId), async (req, res) => {
  try {
    const { id } = req.params;
    const { transaction_id, gateway_response } = req.body;

    // Confirmar pagamento usando service
    await paymentService.confirmPayment(parseInt(id), transaction_id, gateway_response);

    res.json({
      success: true,
      message: "Pagamento confirmado com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao confirmar pagamento:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/payments/:id/refund
 * Reembolsar pagamento
 */
router.post("/:id/refund", authenticate, requireOwnership(getPaymentUserId), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    // Reembolsar pagamento usando service
    const result = await paymentService.refundPayment(parseInt(id), amount, reason);

    res.json({
      success: true,
      message: "Reembolso processado com sucesso",
      refund_amount: result.refund_amount,
    });
  } catch (error) {
    console.error("❌ Erro ao reembolsar pagamento:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/payments/webhook/:gateway
 * Webhook para receber notificações dos gateways
 */
router.post("/webhook/:gateway", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const { gateway } = req.params;
    const payload = req.body;
    const headers = req.headers;

    // Validar assinatura do webhook
    let webhookData;
    const secret = getWebhookSecret(gateway);
    if (!secret) {
      console.warn(`⚠️  Webhook secret não configurado para ${gateway}`);
      // Em desenvolvimento, permitir sem validação se secret não estiver configurado
      if (process.env.NODE_ENV === "production") {
        return res.status(401).json({ error: "Webhook secret not configured" });
      }
      // Parse do payload sem validação (apenas em desenvolvimento)
      webhookData = typeof payload === "string" ? JSON.parse(payload) : JSON.parse(payload.toString());
    } else {
      try {
        webhookData = validateWebhookSignature(gateway, payload, headers, secret);
        console.log(`✅ Webhook de ${gateway} validado:`, webhookData.type || webhookData.action);
      } catch (validationError) {
        console.error(`❌ Webhook inválido de ${gateway}:`, validationError.message);
        return res.status(401).json({
          error: "Invalid webhook signature",
          message: validationError.message,
        });
      }
    }

    // Extrair event_id e event_type baseado no gateway
    // Stripe usa: { id, type }
    // Mercado Pago usa: { data: { id }, action }
    const eventId = webhookData.id || webhookData.data?.id || webhookData._id || null;
    const eventType = webhookData.type || webhookData.action || webhookData.event || "unknown";

    if (!eventId) {
      console.warn(`⚠️  Webhook de ${gateway} sem event_id, processando mesmo assim`);
    }

    // Verificar idempotência (se evento já foi processado)
    if (eventId) {
      const existingEvent = await db("webhook_events")
        .where({ gateway, event_id: eventId })
        .first();

      if (existingEvent) {
        if (existingEvent.status === "processed") {
          console.log(`✅ Webhook ${gateway}:${eventId} já foi processado anteriormente`);
          return res.status(200).json({
            received: true,
            message: "Event already processed",
            event_id: eventId,
          });
        }

        // Se está em processamento ou falhou, incrementar retry_count
        await db("webhook_events")
          .where({ id: existingEvent.id })
          .update({
            retry_count: existingEvent.retry_count + 1,
            status: "pending",
            updated_at: new Date(),
          });
      } else {
        // Registrar novo evento
        await db("webhook_events").insert({
          gateway,
          event_id: eventId,
          event_type: eventType,
          payload: JSON.stringify(webhookData),
          status: "pending",
          retry_count: 0,
        });
      }
    }

    console.log(`📥 Webhook recebido de ${gateway}:`, eventType, eventId ? `(ID: ${eventId})` : "");

    // Responder rapidamente ao gateway
    res.status(200).json({ received: true, event_id: eventId });

    // Processar webhook de forma assíncrona
    setImmediate(async () => {
      try {
        if (eventId) {
          // Atualizar status para processing
          await db("webhook_events")
            .where({ gateway, event_id: eventId })
            .update({ status: "processing", updated_at: new Date() });
        }

        // FASE B3.4: Processar eventos específicos do gateway
        console.log(`📝 Processando webhook de ${gateway}:`, eventType);

        // Processar eventos do Stripe
        if (gateway === 'stripe') {
          await processStripeWebhook(webhookData, eventType, eventId);
        }

        // Processar eventos do Mercado Pago
        if (gateway === 'mercado_pago') {
          await processMercadoPagoWebhook(webhookData, eventType, eventId);
        }

        // Simular processamento bem-sucedido
        if (eventId) {
          await db("webhook_events")
            .where({ gateway, event_id: eventId })
            .update({
              status: "processed",
              processed_at: new Date(),
              updated_at: new Date(),
            });
        }
      } catch (error) {
        console.error("❌ Erro ao processar webhook:", error);
        if (eventId) {
          await db("webhook_events")
            .where({ gateway, event_id: eventId })
            .update({
              status: "failed",
              error_message: error.message,
              updated_at: new Date(),
            });
        }
      }
    });
  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error);
    res.status(500).json({ error: "Erro ao processar webhook" });
  }
});

/**
 * Processar webhook do Stripe
 * FASE B3.4: Processamento específico de eventos Stripe
 */
async function processStripeWebhook(webhookData, eventType, eventId) {
  try {
    const paymentIntentId = webhookData.data?.object?.id || webhookData.object?.id;

    if (!paymentIntentId) {
      console.warn('⚠️  Webhook Stripe sem payment_intent_id');
      return;
    }

    // Buscar pagamento pelo gateway_transaction_id
    const payment = await db('payments')
      .where('gateway_transaction_id', paymentIntentId)
      .where('gateway_provider', 'stripe')
      .first();

    if (!payment) {
      console.warn(`⚠️  Pagamento não encontrado para Stripe payment_intent: ${paymentIntentId}`);
      return;
    }

    // Processar eventos específicos
    switch (eventType) {
      case 'payment_intent.succeeded':
        await db('payments')
          .where('id', payment.id)
          .update({
            status: 'confirmed',
            confirmed_at: new Date(),
            gateway_response: JSON.stringify(webhookData.data?.object || webhookData.object),
            updated_at: new Date(),
          });

        // Atualizar booking
        await db('bookings')
          .where('id', payment.booking_id)
          .update({
            payment_status: 'confirmed',
            updated_at: new Date(),
          });

        // Notificar cliente
        await notificationService.notifyPaymentConfirmed(payment.booking_id);
        console.log(`✅ Pagamento Stripe ${paymentIntentId} confirmado`);
        break;

      case 'payment_intent.payment_failed':
        await db('payments')
          .where('id', payment.id)
          .update({
            status: 'failed',
            gateway_response: JSON.stringify(webhookData.data?.object || webhookData.object),
            updated_at: new Date(),
          });
        console.log(`❌ Pagamento Stripe ${paymentIntentId} falhou`);
        break;

      case 'charge.refunded':
        await db('payments')
          .where('id', payment.id)
          .update({
            status: 'refunded',
            refunded_at: new Date(),
            gateway_response: JSON.stringify(webhookData.data?.object || webhookData.object),
            updated_at: new Date(),
          });
        console.log(`💰 Reembolso Stripe processado para ${paymentIntentId}`);
        break;

      default:
        console.log(`ℹ️  Evento Stripe não processado: ${eventType}`);
    }
  } catch (error) {
    console.error('❌ Erro ao processar webhook Stripe:', error);
    throw error;
  }
}

/**
 * Processar webhook do Mercado Pago
 * FASE B3.4: Processamento específico de eventos Mercado Pago
 */
async function processMercadoPagoWebhook(webhookData, eventType, eventId) {
  try {
    const paymentId = webhookData.data?.id || webhookData.id;

    if (!paymentId) {
      console.warn('⚠️  Webhook Mercado Pago sem payment_id');
      return;
    }

    // Buscar pagamento pelo gateway_transaction_id
    const payment = await db('payments')
      .where('gateway_transaction_id', paymentId.toString())
      .where('gateway_provider', 'mercado_pago')
      .first();

    if (!payment) {
      console.warn(`⚠️  Pagamento não encontrado para Mercado Pago payment: ${paymentId}`);
      return;
    }

    // Processar eventos específicos
    switch (eventType) {
      case 'payment':
        // Mercado Pago envia 'payment' com action específica
        const action = webhookData.action || webhookData.data?.action;
        const paymentStatus = webhookData.data?.status || webhookData.status;

        if (action === 'created' || paymentStatus === 'approved') {
          await db('payments')
            .where('id', payment.id)
            .update({
              status: 'confirmed',
              confirmed_at: new Date(),
              gateway_response: JSON.stringify(webhookData.data || webhookData),
              updated_at: new Date(),
            });

          // Atualizar booking
          await db('bookings')
            .where('id', payment.booking_id)
            .update({
              payment_status: 'confirmed',
              updated_at: new Date(),
            });

          // Notificar cliente
          await notificationService.notifyPaymentConfirmed(payment.booking_id);
          console.log(`✅ Pagamento Mercado Pago ${paymentId} confirmado`);
        } else if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
          await db('payments')
            .where('id', payment.id)
            .update({
              status: 'failed',
              gateway_response: JSON.stringify(webhookData.data || webhookData),
              updated_at: new Date(),
            });
          console.log(`❌ Pagamento Mercado Pago ${paymentId} falhou`);
        }
        break;

      default:
        console.log(`ℹ️  Evento Mercado Pago não processado: ${eventType}`);
    }
  } catch (error) {
    console.error('❌ Erro ao processar webhook Mercado Pago:', error);
    throw error;
  }
}

module.exports = router;

