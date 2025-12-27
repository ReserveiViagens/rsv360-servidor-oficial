/**
 * 💬 Group Chat Validators
 * FASE 2.1.7: Validadores Joi para chat em grupo
 */

const Joi = require("joi");

const sendMessageSchema = Joi.object({
  chat_id: Joi.number().integer().required(),
  message: Joi.string().required().min(1).max(2000).trim(),
  attachment_url: Joi.string().uri().optional().allow(null),
});

const addParticipantSchema = Joi.object({
  chat_id: Joi.number().integer().required(),
  user_id: Joi.number().integer().required(),
});

module.exports = {
  sendMessageSchema,
  addParticipantSchema,
};

