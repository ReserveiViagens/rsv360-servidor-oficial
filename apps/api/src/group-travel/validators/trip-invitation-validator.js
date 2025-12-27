/**
 * ✉️ Trip Invitation Validators
 * FASE 2.1.7: Validadores Joi para convites de viagem
 */

const Joi = require("joi");

const createInvitationSchema = Joi.object({
  booking_id: Joi.number().integer().required(),
  invited_email: Joi.string().email().required(),
  message: Joi.string().optional().max(500).allow(null),
});

const acceptInvitationSchema = Joi.object({
  token: Joi.string().required().length(64), // 32 bytes em hex = 64 caracteres
});

const declineInvitationSchema = Joi.object({
  token: Joi.string().required().length(64),
});

module.exports = {
  createInvitationSchema,
  acceptInvitationSchema,
  declineInvitationSchema,
};

