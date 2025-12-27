/**
 * 🔐 Ownership Helpers
 * FASE A4: Funções auxiliares para verificar ownership de recursos
 */

const { db } = require('../config/database');

/**
 * Obter customer_id de um booking
 * @param {Object} req - Request object
 * @returns {Promise<number|null>} customer_id do booking
 */
async function getBookingCustomerId(req) {
  const { id } = req.params;
  const booking = await db('bookings').where('id', parseInt(id)).first();
  
  if (!booking) {
    return null;
  }

  // Buscar customer_id através do customer
  if (booking.customer_id) {
    const customer = await db('customers').where('id', booking.customer_id).first();
    return customer ? customer.user_id : null;
  }

  return null;
}

/**
 * Obter owner_id de uma property
 * @param {Object} req - Request object
 * @returns {Promise<number|null>} owner_id da property (ou user_id do owner)
 */
async function getPropertyOwnerId(req) {
  const { id } = req.params;
  const property = await db('properties').where('id', parseInt(id)).first();
  
  if (!property) {
    return null;
  }

  // Se property tem owner_id, buscar o user_id do owner
  if (property.owner_id) {
    const owner = await db('owners').where('id', property.owner_id).first();
    return owner ? owner.user_id : null;
  }

  return null;
}

/**
 * Obter user_id de um payment (através do booking)
 * @param {Object} req - Request object
 * @returns {Promise<number|null>} user_id do payment
 */
async function getPaymentUserId(req) {
  const { id } = req.params;
  const payment = await db('payments').where('id', parseInt(id)).first();
  
  if (!payment) {
    return null;
  }

  // Se payment tem user_id direto, retornar
  if (payment.user_id) {
    return payment.user_id;
  }

  // Se payment tem booking_id, buscar através do booking
  if (payment.booking_id) {
    const booking = await db('bookings').where('id', payment.booking_id).first();
    if (booking && booking.customer_id) {
      const customer = await db('customers').where('id', booking.customer_id).first();
      return customer ? customer.user_id : null;
    }
  }

  return null;
}

/**
 * Verificar se usuário é owner de uma property
 * @param {number} userId - ID do usuário
 * @param {number} propertyId - ID da property
 * @returns {Promise<boolean>} true se usuário é owner
 */
async function isPropertyOwner(userId, propertyId) {
  const property = await db('properties').where('id', propertyId).first();
  if (!property || !property.owner_id) {
    return false;
  }

  const owner = await db('owners').where('id', property.owner_id).first();
  return owner && owner.user_id === userId;
}

/**
 * Verificar se usuário é customer de um booking
 * @param {number} userId - ID do usuário
 * @param {number} bookingId - ID do booking
 * @returns {Promise<boolean>} true se usuário é customer
 */
async function isBookingCustomer(userId, bookingId) {
  const booking = await db('bookings').where('id', bookingId).first();
  if (!booking || !booking.customer_id) {
    return false;
  }

  const customer = await db('customers').where('id', booking.customer_id).first();
  return customer && customer.user_id === userId;
}

module.exports = {
  getBookingCustomerId,
  getPropertyOwnerId,
  getPaymentUserId,
  isPropertyOwner,
  isBookingCustomer,
};

