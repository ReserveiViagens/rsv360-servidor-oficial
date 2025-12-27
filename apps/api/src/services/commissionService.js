/**
 * 💰 Commission Service
 * FASE 1.3.4: Serviço de comissões e repasse automático
 * Calcula e processa comissões para plataforma, hosts e parceiros
 */

const { db, withTransaction } = require("../config/database");
const paymentService = require("./paymentService");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ service: 'commissionService' });

// Taxas padrão (podem ser configuráveis por propriedade)
const DEFAULT_PLATFORM_FEE = 0.20; // 20%
const DEFAULT_HOST_FEE = 0.75; // 75%
const DEFAULT_PARTNER_FEE = 0.05; // 5% (se houver parceiro)

/**
 * Calcular comissões para uma reserva
 * 
 * @param {number} bookingId - ID da reserva
 * @param {Object} [options={}] - Opções de cálculo
 * @returns {Promise<Object>} Comissões calculadas
 */
async function calculateCommissions(bookingId, options = {}) {
  try {
    const booking = await db("bookings")
      .where("id", bookingId)
      .first();

    if (!booking) {
      throw new Error("Reserva não encontrada");
    }

    const totalAmount = parseFloat(booking.total_amount || 0);
    
    // Buscar propriedade para obter owner_id
    const property = await db("properties")
      .where("id", booking.property_id)
      .first();

    if (!property) {
      throw new Error("Propriedade não encontrada");
    }

    // Verificar se há parceiro associado
    const partner = await db("partners")
      .where("property_id", booking.property_id)
      .first();

    // Calcular splits
    const platformFee = options.platform_fee || DEFAULT_PLATFORM_FEE;
    const hostFee = options.host_fee || DEFAULT_HOST_FEE;
    const partnerFee = partner ? (options.partner_fee || DEFAULT_PARTNER_FEE) : 0;

    // Validar que soma = 1.0
    const totalFee = platformFee + hostFee + partnerFee;
    if (Math.abs(totalFee - 1.0) > 0.01) {
      throw new Error(`Soma de taxas deve ser 1.0, mas é ${totalFee}`);
    }

    const platformAmount = Math.round(totalAmount * platformFee * 100) / 100;
    const hostAmount = Math.round(totalAmount * hostFee * 100) / 100;
    const partnerAmount = partner ? Math.round(totalAmount * partnerFee * 100) / 100 : 0;

    // Ajustar último valor para compensar arredondamentos
    const calculatedTotal = platformAmount + hostAmount + partnerAmount;
    const difference = totalAmount - calculatedTotal;
    const hostAmountAdjusted = hostAmount + difference;

    return {
      booking_id: bookingId,
      total_amount: totalAmount,
      splits: {
        platform: {
          recipient_id: null, // Plataforma
          amount: platformAmount,
          percentage: platformFee * 100,
        },
        host: {
          recipient_id: property.owner_id,
          amount: hostAmountAdjusted,
          percentage: hostFee * 100,
        },
        ...(partner ? {
          partner: {
            recipient_id: partner.user_id,
            amount: partnerAmount,
            percentage: partnerFee * 100,
          },
        } : {}),
      },
    };
  } catch (error) {
    logger.error('Erro ao calcular comissões', { bookingId, error: error.message });
    throw error;
  }
}

/**
 * Processar repasse automático de comissões
 */
async function processCommissionPayout(bookingId) {
  try {
    const commissions = await calculateCommissions(bookingId);

    // Criar registros de split payment
    const splits = Object.values(commissions.splits)
      .filter(split => split.recipient_id !== null) // Excluir plataforma
      .map(split => ({
        booking_id: bookingId,
        user_id: split.recipient_id,
        amount: split.amount,
        status: 'pending',
        created_at: new Date(),
      }));

    if (splits.length > 0) {
      await db("payment_splits").insert(splits);
      logger.info('Splits de comissão criados', { bookingId, splitsCount: splits.length });
    }

    return {
      success: true,
      commissions,
      splits_created: splits.length,
    };
  } catch (error) {
    logger.error('Erro ao processar repasse de comissões', { bookingId, error: error.message });
    throw error;
  }
}

/**
 * Obter comissões de um host
 */
async function getHostCommissions(hostId, startDate, endDate) {
  try {
    const commissions = await db("payment_splits")
      .select(
        "payment_splits.*",
        "bookings.booking_number",
        "bookings.total_amount",
        "properties.title as property_title"
      )
      .leftJoin("bookings", "payment_splits.booking_id", "bookings.id")
      .leftJoin("properties", "bookings.property_id", "properties.id")
      .where("payment_splits.user_id", hostId)
      .whereBetween("payment_splits.created_at", [startDate, endDate])
      .orderBy("payment_splits.created_at", "desc");

    return commissions;
  } catch (error) {
    logger.error('Erro ao obter comissões do host', { hostId, error: error.message });
    throw error;
  }
}

module.exports = {
  calculateCommissions,
  processCommissionPayout,
  getHostCommissions,
};

