/**
 * 📋 Group Travel Types
 * FASE 2.1.1: Types consolidados para Viagens em Grupo
 * Define todas as interfaces e DTOs usados no módulo de Group Travel
 */

/**
 * @typedef {Object} SharedWishlist
 * @property {number} id
 * @property {string} name
 * @property {number} created_by
 * @property {Date} created_at
 * @property {Date} updated_at
 * @property {WishlistMember[]} [members]
 * @property {WishlistItem[]} [items]
 */

/**
 * @typedef {Object} WishlistMember
 * @property {number} id
 * @property {number} wishlist_id
 * @property {number} user_id
 * @property {'admin'|'member'} role
 * @property {Date} joined_at
 * @property {Object} [user]
 * @property {number} user.id
 * @property {string} user.name
 * @property {string} user.email
 * @property {string} [user.avatar]
 */

/**
 * @typedef {Object} WishlistItem
 * @property {number} id
 * @property {number} wishlist_id
 * @property {number} property_id
 * @property {number} added_by
 * @property {number} votes_up
 * @property {number} votes_down
 * @property {Date} added_at
 * @property {Comment[]} [comments]
 * @property {Object} [property]
 * @property {number} property.id
 * @property {string} property.name
 * @property {number} property.price
 * @property {string[]} property.images
 * @property {string} property.location
 * @property {'up'|'down'|'maybe'|null} [user_vote]
 */

/**
 * @typedef {Object} Vote
 * @property {number} id
 * @property {number} user_id
 * @property {number} item_id
 * @property {'up'|'down'|'maybe'} vote
 * @property {Date} timestamp
 */

/**
 * @typedef {Object} SplitPayment
 * @property {number} id
 * @property {number} booking_id
 * @property {number} total_amount
 * @property {string} currency
 * @property {PaymentSplit[]} splits
 * @property {'pending'|'partial'|'completed'} status
 * @property {Date} created_at
 * @property {Date} updated_at
 */

/**
 * @typedef {Object} PaymentSplit
 * @property {number} id
 * @property {number} booking_id
 * @property {number} user_id
 * @property {number} amount
 * @property {number} [percentage]
 * @property {'pending'|'paid'|'failed'} status
 * @property {Date} [paid_at]
 * @property {string} [payment_method]
 * @property {Date} created_at
 * @property {Object} [user]
 * @property {string} user.name
 * @property {string} user.email
 */

/**
 * @typedef {Object} TripInvitation
 * @property {number} id
 * @property {number} booking_id
 * @property {number} invited_by
 * @property {string} invited_email
 * @property {string} token
 * @property {'pending'|'accepted'|'declined'|'expired'} status
 * @property {Date} expires_at
 * @property {Date} created_at
 * @property {Date} [accepted_at]
 */

/**
 * @typedef {Object} GroupChat
 * @property {number} id
 * @property {number} booking_id
 * @property {number[]} participants
 * @property {Date} created_at
 * @property {GroupMessage[]} [messages]
 */

/**
 * @typedef {Object} ChatMember
 * @property {number} id
 * @property {number} chat_id
 * @property {number} user_id
 * @property {Date} joined_at
 * @property {Date} [left_at]
 */

/**
 * @typedef {Object} GroupMessage
 * @property {number} id
 * @property {number} chat_id
 * @property {number} sender_id
 * @property {string} message
 * @property {Date} created_at
 * @property {boolean} [read]
 * @property {Object} [sender]
 * @property {string} sender.name
 * @property {string} [sender.avatar]
 */

/**
 * @typedef {Object} MessageAttachment
 * @property {number} id
 * @property {number} message_id
 * @property {string} file_url
 * @property {string} file_type
 * @property {string} file_name
 */

/**
 * @typedef {Object} Comment
 * @property {number} user_id
 * @property {string} user_name
 * @property {string} message
 * @property {Date} timestamp
 */

// ==================== DTOs ====================

/**
 * @typedef {Object} CreateWishlistDTO
 * @property {string} name
 * @property {string[]} [member_emails]
 */

/**
 * @typedef {Object} UpdateWishlistDTO
 * @property {string} [name]
 */

/**
 * @typedef {Object} AddItemDTO
 * @property {number} wishlist_id
 * @property {number} property_id
 * @property {string} [notes]
 */

/**
 * @typedef {Object} VoteDTO
 * @property {number} item_id
 * @property {'up'|'down'|'maybe'} vote
 */

/**
 * @typedef {Object} CreateSplitPaymentDTO
 * @property {number} booking_id
 * @property {number} total_amount
 * @property {Array<{user_id: number, amount?: number, percentage?: number}>} splits
 */

/**
 * @typedef {Object} InviteMemberDTO
 * @property {number} wishlist_id
 * @property {string} email
 * @property {'admin'|'member'} [role]
 */

/**
 * @typedef {Object} CreateTripInvitationDTO
 * @property {number} booking_id
 * @property {string} invited_email
 * @property {string} [message]
 */

/**
 * @typedef {Object} SendMessageDTO
 * @property {number} chat_id
 * @property {string} message
 * @property {string} [attachment_url]
 */

module.exports = {
  // Types são exportados via JSDoc para uso em outros arquivos
  // Este arquivo serve como documentação centralizada
};

