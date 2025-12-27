/**
 * 📋 Wishlist Validators
 * FASE 2.1.7: Validadores Joi para wishlists
 */

const Joi = require("joi");

const createWishlistSchema = Joi.object({
  name: Joi.string().required().min(3).max(100).trim(),
  member_emails: Joi.array().items(Joi.string().email()).optional().max(20),
});

const updateWishlistSchema = Joi.object({
  name: Joi.string().optional().min(3).max(100).trim(),
});

const addItemSchema = Joi.object({
  wishlist_id: Joi.number().integer().required(),
  property_id: Joi.number().integer().required(),
  notes: Joi.string().optional().max(500).allow(null),
});

const addMemberSchema = Joi.object({
  wishlist_id: Joi.number().integer().required(),
  email: Joi.string().email().required(),
  role: Joi.string().valid('admin', 'member').default('member'),
});

const voteSchema = Joi.object({
  item_id: Joi.number().integer().required(),
  vote: Joi.string().valid('up', 'down', 'maybe').required(),
});

module.exports = {
  createWishlistSchema,
  updateWishlistSchema,
  addItemSchema,
  addMemberSchema,
  voteSchema,
};

