/**
 * 📅 Google Calendar Routes
 * FASE 5.1: Rotas para integração com Google Calendar
 */

const express = require("express");
const Joi = require("joi");
const router = express.Router();
const googleCalendarService = require("../../services/googleCalendarService");
const { advancedJWTValidation, requireRole } = require("../../middleware/advancedAuth");
const { createLogger } = require("../../utils/logger");

const logger = createLogger({ service: 'googleCalendarRoutes' });
const authenticate = advancedJWTValidation;

// Schema para salvar autorização
const saveAuthSchema = Joi.object({
  access_token: Joi.string().required(),
  refresh_token: Joi.string().required(),
  expires_in: Joi.number().integer().required(),
});

// Schema para criar evento
const createEventSchema = Joi.object({
  booking_id: Joi.number().integer().required(),
  calendar_id: Joi.string().default('primary'),
});

/**
 * POST /api/rsv360/integrations/google-calendar/auth
 * Salvar autorização OAuth2 do Google Calendar
 */
router.post("/auth", authenticate, async (req, res) => {
  try {
    const { error, value } = saveAuthSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: "Dados inválidos", details: error.details.map(d => d.message) });
    }

    const authData = await googleCalendarService.saveCalendarAuth(req.user.id, value);
    res.status(201).json(authData);
  } catch (error) {
    logger.error('Erro ao salvar autorização Google Calendar', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * GET /api/rsv360/integrations/google-calendar/connected
 * Verificar se Google Calendar está conectado
 */
router.get("/connected", authenticate, async (req, res) => {
  try {
    const connected = await googleCalendarService.isCalendarConnected(req.user.id);
    res.json({ connected });
  } catch (error) {
    logger.error('Erro ao verificar conexão Google Calendar', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * POST /api/rsv360/integrations/google-calendar/events
 * Criar evento no Google Calendar
 */
router.post("/events", authenticate, async (req, res) => {
  try {
    const { error, value } = createEventSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: "Dados inválidos", details: error.details.map(d => d.message) });
    }

    const event = await googleCalendarService.createCalendarEvent(
      req.user.id,
      value.booking_id,
      value.calendar_id
    );
    res.status(201).json(event);
  } catch (error) {
    logger.error('Erro ao criar evento Google Calendar', { userId: req.user.id, body: req.body, error: error.message });
    res.status(500).json({ error: error.message || "Erro interno do servidor" });
  }
});

/**
 * POST /api/rsv360/integrations/google-calendar/sync
 * Sincronizar disponibilidade do Google Calendar
 */
router.post("/sync", authenticate, async (req, res) => {
  try {
    const { calendar_id } = req.body;
    const result = await googleCalendarService.syncAvailabilityFromCalendar(
      req.user.id,
      calendar_id || 'primary'
    );
    res.json(result);
  } catch (error) {
    logger.error('Erro ao sincronizar Google Calendar', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: error.message || "Erro interno do servidor" });
  }
});

module.exports = router;

