/**
 * 💰 Split Payment Validators
 * FASE 2.1.7: Validadores Joi para split payments
 */

const Joi = require("joi");

const createSplitPaymentSchema = Joi.object({
  booking_id: Joi.number().integer().required(),
  splits: Joi.array()
    .items(
      Joi.object({
        user_id: Joi.number().integer().required(),
        amount: Joi.number().positive().optional(),
        percentage: Joi.number().min(0).max(100).optional(),
      }).or('amount', 'percentage')
    )
    .min(1)
    .max(20)
    .required(),
});

const markAsPaidSchema = Joi.object({
  split_id: Joi.number().integer().required(),
  payment_method: Joi.string().optional().max(50),
});

module.exports = {
  createSplitPaymentSchema,
  markAsPaidSchema,
};

