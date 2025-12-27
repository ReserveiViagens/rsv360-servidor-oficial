/**
 * 📅 Rotas RSV360 - Bookings
 * FASE 3.1: Rotas específicas de reservas RSV360
 * Integra com bookingService e availabilityService
 */

const express = require("express");
const Joi = require("joi");
const router = express.Router();
const { db } = require("../config/database");
const bookingService = require("../services/bookingService");
const availabilityService = require("../services/availabilityService");
const notificationService = require("../services/notificationService");
const { advancedJWTValidation, requireRole, requireOwnership } = require("../middleware/advancedAuth");
const { getBookingCustomerId } = require("../middleware/ownershipHelpers");
// FASE C7: Rate limiting específico
const { bookingsRateLimiter } = require("../middleware/rateLimiter");

// Usar advancedAuth (FASE 4)
const authenticate = advancedJWTValidation;

// FASE C7: Aplicar rate limiting em todas as rotas de bookings
router.use(bookingsRateLimiter);

// FASE B2.4: Validação Joi melhorada para datas
const { validateDateFormat, validateDateLogic } = require("../utils/dateValidation");

// Schema de validação para criação de reserva
const createBookingSchema = Joi.object({
  property_id: Joi.number().integer().required(),
  customer_id: Joi.number().integer().optional(),
  check_in: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .custom((value, helpers) => {
      const validation = validateDateFormat(value);
      if (!validation.valid) {
        return helpers.error("any.invalid", { message: validation.error });
      }
      // Verificar se não está no passado
      const date = new Date(value + "T00:00:00.000Z");
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (date < today) {
        return helpers.error("any.invalid", { message: "Check-in não pode ser no passado" });
      }
      return value;
    })
    .messages({
      "string.pattern.base": "Check-in deve estar no formato YYYY-MM-DD (ex: 2025-07-15)",
      "any.invalid": "{{#label}} inválido: {{#error.message}}",
    }),
  check_out: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .custom((value, helpers) => {
      const validation = validateDateFormat(value);
      if (!validation.valid) {
        return helpers.error("any.invalid", { message: validation.error });
      }
      // Verificar se não está no passado
      const date = new Date(value + "T00:00:00.000Z");
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (date < today) {
        return helpers.error("any.invalid", { message: "Check-out não pode ser no passado" });
      }
      return value;
    })
    .messages({
      "string.pattern.base": "Check-out deve estar no formato YYYY-MM-DD (ex: 2025-07-20)",
      "any.invalid": "{{#label}} inválido: {{#error.message}}",
    }),
  guests_count: Joi.number().integer().min(1).required(),
  customer_data: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    document: Joi.string().optional(),
  }).when("customer_id", {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  special_requests: Joi.string().max(1000).optional(),
  metadata: Joi.object().optional(),
}).custom((value, helpers) => {
  // Validar lógica: check_out > check_in
  if (value.check_in && value.check_out) {
    const validation = validateDateLogic(value.check_in, value.check_out, {
      allowPast: false,
      minStayDays: 1,
    });
    if (!validation.valid) {
      return helpers.error("any.invalid", { message: validation.error });
    }
  }
  return value;
});

// Schema de validação para atualização
const updateBookingSchema = Joi.object({
  check_in: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .custom((value, helpers) => {
      if (!value) return value; // Opcional
      const validation = validateDateFormat(value);
      if (!validation.valid) {
        return helpers.error("any.invalid", { message: validation.error });
      }
      // Verificar se não está no passado
      const date = new Date(value + "T00:00:00.000Z");
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (date < today) {
        return helpers.error("any.invalid", { message: "Check-in não pode ser no passado" });
      }
      return value;
    })
    .messages({
      "string.pattern.base": "Check-in deve estar no formato YYYY-MM-DD",
      "any.invalid": "{{#label}} inválido: {{#error.message}}",
    }),
  check_out: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .custom((value, helpers) => {
      if (!value) return value; // Opcional
      const validation = validateDateFormat(value);
      if (!validation.valid) {
        return helpers.error("any.invalid", { message: validation.error });
      }
      // Verificar se não está no passado
      const date = new Date(value + "T00:00:00.000Z");
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (date < today) {
        return helpers.error("any.invalid", { message: "Check-out não pode ser no passado" });
      }
      return value;
    })
    .messages({
      "string.pattern.base": "Check-out deve estar no formato YYYY-MM-DD",
      "any.invalid": "{{#label}} inválido: {{#error.message}}",
    }),
  guests_count: Joi.number().integer().min(1).optional(),
  special_requests: Joi.string().max(1000).optional(),
  status: Joi.string()
    .valid("pending", "confirmed", "cancelled", "completed")
    .optional(),
}).custom((value, helpers) => {
  // Validar lógica se ambos check_in e check_out estiverem presentes
  if (value.check_in && value.check_out) {
    const validation = validateDateLogic(value.check_in, value.check_out, {
      allowPast: false,
      minStayDays: 1,
    });
    if (!validation.valid) {
      return helpers.error("any.invalid", { message: validation.error });
    }
  }
  return value;
});

/**
 * POST /api/rsv360/bookings
 * Criar nova reserva com optimistic locking
 */
router.post("/", authenticate, async (req, res) => {
  try {
    // Validar dados
    const { error, value } = createBookingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const {
      property_id,
      customer_id,
      check_in,
      check_out,
      guests_count,
      customer_data,
      special_requests,
      metadata,
    } = value;

    // Criar ou buscar cliente se necessário
    let finalCustomerId = customer_id;
    if (!finalCustomerId && customer_data) {
      let customer = await db("customers")
        .where("email", customer_data.email)
        .first();

      if (!customer) {
        // Buscar user_id do usuário autenticado ou criar novo
        const userId = req.user?.id || 1;

        const [newCustomer] = await db("customers")
          .insert({
            user_id: userId,
            name: customer_data.name,
            email: customer_data.email,
            phone: customer_data.phone,
            document_number: customer_data.document || null,
          })
          .returning("*");

        finalCustomerId = newCustomer.id;
      } else {
        finalCustomerId = customer.id;
      }
    }

    // Criar reserva usando bookingService (com optimistic locking)
    const booking = await bookingService.createBookingWithLocking({
      property_id,
      customer_id: finalCustomerId,
      check_in,
      check_out,
      guests_count,
      user_id: req.user?.id || 1,
      special_requests: special_requests || null,
      metadata: metadata || null,
    });

    // Notificar confirmação (em background)
    notificationService.notifyBookingConfirmed(booking.id).catch((err) => {
      console.error("❌ Erro ao enviar notificação:", err);
    });

    res.status(201).json({
      success: true,
      booking: {
        id: booking.id,
        booking_number: booking.booking_number,
        property_id: booking.property_id,
        customer_id: booking.customer_id,
        check_in: booking.check_in,
        check_out: booking.check_out,
        guests_count: booking.guests_count,
        total_amount: booking.total_amount,
        status: booking.status,
        version: booking.version, // Incluir version para cliente
      },
    });
  } catch (error) {
    console.error("❌ Erro ao criar reserva:", error);

    if (error.message.includes("não disponível")) {
      return res.status(409).json({
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
 * GET /api/rsv360/bookings/availability/:propertyId
 * Verificar disponibilidade de uma propriedade
 */
router.get("/availability/:propertyId", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({
        error: "checkIn e checkOut são obrigatórios (query params)",
      });
    }

    const availability = await availabilityService.checkAvailability(
      parseInt(propertyId),
      checkIn,
      checkOut,
    );

    res.json(availability);
  } catch (error) {
    console.error("❌ Erro ao verificar disponibilidade:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/bookings
 * Listar reservas com filtros e paginação
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const {
      status,
      property_id,
      customer_id,
      page = 1,
      limit = 20,
    } = req.query;

    let query = db("bookings")
      .select(
        "bookings.*",
        "properties.title as property_title",
        "properties.address_city",
        "customers.name as customer_name",
        "customers.email as customer_email",
      )
      .leftJoin("properties", "bookings.property_id", "properties.id")
      .leftJoin("customers", "bookings.customer_id", "customers.id")
      .orderBy("bookings.created_at", "desc");

    // Filtros
    if (status) {
      query = query.where("bookings.status", status);
    }
    if (property_id) {
      query = query.where("bookings.property_id", parseInt(property_id));
    }
    if (customer_id) {
      query = query.where("bookings.customer_id", parseInt(customer_id));
    }

    // Paginação
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const bookings = await query.limit(parseInt(limit)).offset(offset);

    // Total de registros
    const totalQuery = db("bookings");
    if (status) totalQuery.where("status", status);
    if (property_id) totalQuery.where("property_id", parseInt(property_id));
    if (customer_id) totalQuery.where("customer_id", parseInt(customer_id));
    const total = await totalQuery.count("* as count").first();

    res.json({
      success: true,
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total.count),
        totalPages: Math.ceil(total.count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Erro ao listar reservas:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/bookings/:id
 * Obter reserva específica com version
 */
router.get("/:id", authenticate, requireOwnership(getBookingCustomerId), async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await bookingService.getBookingWithVersion(parseInt(id));

    res.json({
      success: true,
      booking,
    });
  } catch (error) {
    if (error.message.includes("não encontrada")) {
      return res.status(404).json({
        error: error.message,
      });
    }

    console.error("❌ Erro ao obter reserva:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

/**
 * PUT /api/rsv360/bookings/:id
 * Atualizar reserva com verificação de version (optimistic locking)
 */
router.put("/:id", authenticate, requireOwnership(getBookingCustomerId), async (req, res) => {
  try {
    const { id } = req.params;
    const { version, ...updates } = req.body;

    if (!version) {
      return res.status(400).json({
        error: "Campo 'version' é obrigatório para atualização",
      });
    }

    // Validar dados de atualização
    const { error, value } = updateBookingSchema.validate(updates);
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    // Atualizar usando bookingService (com version check)
    const updatedBooking = await bookingService.updateBookingWithVersionCheck(
      parseInt(id),
      value,
      parseInt(version),
    );

    res.json({
      success: true,
      booking: updatedBooking,
      message: "Reserva atualizada com sucesso",
    });
  } catch (error) {
    if (error.message.includes("BOOKING_MODIFIED")) {
      return res.status(409).json({
        error: "Reserva foi modificada por outro usuário",
        message: error.message,
      });
    }

    if (error.message.includes("não encontrada")) {
      return res.status(404).json({
        error: error.message,
      });
    }

    console.error("❌ Erro ao atualizar reserva:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/bookings/:id/confirm
 * Confirmar reserva com version check
 */
router.post("/:id/confirm", authenticate, requireOwnership(getBookingCustomerId), async (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.body;

    if (!version) {
      return res.status(400).json({
        error: "Campo 'version' é obrigatório",
      });
    }

    const booking = await bookingService.confirmBookingWithVersionCheck(
      parseInt(id),
      parseInt(version),
    );

    // Notificar confirmação (em background)
    notificationService.notifyBookingConfirmed(booking.id).catch((err) => {
      console.error("❌ Erro ao enviar notificação:", err);
    });

    res.json({
      success: true,
      booking,
      message: "Reserva confirmada com sucesso",
    });
  } catch (error) {
    if (error.message.includes("BOOKING_MODIFIED")) {
      return res.status(409).json({
        error: "Reserva foi modificada por outro usuário",
        message: error.message,
      });
    }

    console.error("❌ Erro ao confirmar reserva:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/bookings/:id/cancel
 * Cancelar reserva com version check
 */
router.post("/:id/cancel", authenticate, requireOwnership(getBookingCustomerId), async (req, res) => {
  try {
    const { id } = req.params;
    const { version, reason } = req.body;

    if (!version) {
      return res.status(400).json({
        error: "Campo 'version' é obrigatório",
      });
    }

    const booking = await bookingService.cancelBookingWithVersionCheck(
      parseInt(id),
      parseInt(version),
      reason || null,
    );

    // Notificar cancelamento (em background)
    notificationService.notifyBookingCancelled(booking.id, reason || "").catch((err) => {
      console.error("❌ Erro ao enviar notificação:", err);
    });

    res.json({
      success: true,
      booking,
      message: "Reserva cancelada com sucesso",
    });
  } catch (error) {
    if (error.message.includes("BOOKING_MODIFIED")) {
      return res.status(409).json({
        error: "Reserva foi modificada por outro usuário",
        message: error.message,
      });
    }

    console.error("❌ Erro ao cancelar reserva:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

module.exports = router;

