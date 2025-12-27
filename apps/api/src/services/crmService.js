/**
 * 📊 CRM Service
 * FASE 1.3.3: Serviço de CRM para segmentação e campanhas
 * Gerencia interações, segmentação de clientes e campanhas de marketing
 */

const { db } = require("../config/database");
const advancedCacheService = require("./advancedCacheService");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ service: 'crmService' });

/**
 * Criar segmento de clientes
 * 
 * @param {Object} segmentData - Dados do segmento
 * @returns {Promise<Object>} Segmento criado
 */
async function createSegment(segmentData) {
  try {
    const [segment] = await db("crm_segments").insert({
      name: segmentData.name,
      description: segmentData.description || null,
      criteria: JSON.stringify(segmentData.criteria || {}),
      created_at: new Date(),
      updated_at: new Date(),
    }).returning("*");

    logger.info('Segmento criado', { segmentId: segment.id });
    return segment;
  } catch (error) {
    logger.error('Erro ao criar segmento', { segmentData, error: error.message });
    throw error;
  }
}

/**
 * Obter clientes de um segmento
 */
async function getSegmentCustomers(segmentId) {
  try {
    const segment = await db("crm_segments")
      .where("id", segmentId)
      .first();

    if (!segment) {
      throw new Error("Segmento não encontrado");
    }

    const criteria = JSON.parse(segment.criteria || "{}");
    
    // Construir query baseado em critérios
    let query = db("customers");

    if (criteria.min_bookings) {
      query = query.whereRaw(
        "(SELECT COUNT(*) FROM bookings WHERE bookings.customer_id = customers.id) >= ?",
        [criteria.min_bookings]
      );
    }

    if (criteria.min_total_spent) {
      query = query.whereRaw(
        "(SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE bookings.customer_id = customers.id) >= ?",
        [criteria.min_total_spent]
      );
    }

    if (criteria.last_booking_days) {
      query = query.whereRaw(
        "(SELECT MAX(created_at) FROM bookings WHERE bookings.customer_id = customers.id) >= NOW() - INTERVAL '? days'",
        [criteria.last_booking_days]
      );
    }

    const customers = await query;

    return customers;
  } catch (error) {
    logger.error('Erro ao obter clientes do segmento', { segmentId, error: error.message });
    throw error;
  }
}

/**
 * Criar campanha de marketing
 */
async function createCampaign(campaignData) {
  try {
    const [campaign] = await db("crm_campaigns").insert({
      name: campaignData.name,
      description: campaignData.description || null,
      segment_id: campaignData.segment_id || null,
      campaign_type: campaignData.campaign_type || 'email',
      status: 'draft',
      created_at: new Date(),
      updated_at: new Date(),
    }).returning("*");

    logger.info('Campanha criada', { campaignId: campaign.id });
    return campaign;
  } catch (error) {
    logger.error('Erro ao criar campanha', { campaignData, error: error.message });
    throw error;
  }
}

/**
 * Registrar interação com cliente
 */
async function recordInteraction(interactionData) {
  try {
    const [interaction] = await db("crm_interactions").insert({
      customer_id: interactionData.customer_id,
      interaction_type: interactionData.interaction_type, // 'email', 'sms', 'push', 'call', 'visit'
      channel: interactionData.channel || null,
      content: interactionData.content || null,
      metadata: JSON.stringify(interactionData.metadata || {}),
      created_at: new Date(),
    }).returning("*");

    logger.info('Interação registrada', { interactionId: interaction.id });
    return interaction;
  } catch (error) {
    logger.error('Erro ao registrar interação', { interactionData, error: error.message });
    throw error;
  }
}

/**
 * Obter histórico de interações de um cliente
 */
async function getCustomerInteractions(customerId, limit = 50) {
  try {
    const interactions = await db("crm_interactions")
      .where("customer_id", customerId)
      .orderBy("created_at", "desc")
      .limit(limit);

    return interactions.map(interaction => ({
      ...interaction,
      metadata: interaction.metadata ? JSON.parse(interaction.metadata) : {},
    }));
  } catch (error) {
    logger.error('Erro ao obter interações do cliente', { customerId, error: error.message });
    throw error;
  }
}

module.exports = {
  createSegment,
  getSegmentCustomers,
  createCampaign,
  recordInteraction,
  getCustomerInteractions,
};

