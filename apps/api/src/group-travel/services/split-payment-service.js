/**
 * 💰 Split Payment Service
 * FASE 2.1.3: Serviço de divisão de pagamentos para viagens em grupo
 * Gerencia splits de pagamento com validação e notificações
 */

const { db, withTransaction } = require("../../config/database");
const paymentService = require("../../services/paymentService");
const notificationService = require("../../services/notificationService");
const { createLogger } = require("../../utils/logger");

const logger = createLogger({ service: 'splitPaymentService' });

/**
 * Criar split payment para uma reserva
 * 
 * @param {number} bookingId - ID da reserva
 * @param {Array<{user_id: number, amount?: number, percentage?: number}>} splits - Divisões
 * @returns {Promise<Object>} Split payment criado
 */
async function createSplitPayment(bookingId, splits) {
  try {
    // Validar splits
    validateSplits(splits);

    // Buscar reserva
    const booking = await db("bookings")
      .where("id", bookingId)
      .first();

    if (!booking) {
      throw new Error("Reserva não encontrada");
    }

    // Verificar se já existe split payment
    const existing = await db("payment_splits")
      .where("booking_id", bookingId)
      .first();

    if (existing) {
      throw new Error("Split payment já existe para esta reserva");
    }

    const totalAmount = parseFloat(booking.total_amount || 0);

    // Calcular splits se necessário
    const calculatedSplits = calculateSplits(totalAmount, splits);

    // Validar que soma = total
    const splitTotal = calculatedSplits.reduce((sum, s) => sum + s.amount, 0);
    const tolerance = 0.01; // 1 centavo
    if (Math.abs(splitTotal - totalAmount) > tolerance) {
      throw new Error(
        `Soma dos splits (${splitTotal}) não corresponde ao total (${totalAmount}). ` +
        `Diferença: ${Math.abs(splitTotal - totalAmount)}`
      );
    }

    return await withTransaction(async (trx) => {
      // Buscar ou criar payment para esta reserva
      let payment = await trx("payments")
        .where("booking_id", bookingId)
        .first();

      if (!payment) {
        // Criar payment temporário se não existir
        const [newPayment] = await trx("payments").insert({
          booking_id: bookingId,
          user_id: booking.user_id,
          transaction_id: `temp_split_${Date.now()}`,
          amount: totalAmount,
          currency: 'BRL',
          method: 'split_payment',
          gateway_provider: 'internal',
          status: 'pending',
          created_at: new Date(),
        }).returning("*");
        payment = newPayment;
      }

      // Criar splits
      const splitRecords = await Promise.all(
        calculatedSplits.map(async (split) => {
          const splitData = {
            payment_id: payment.id,
            recipient_id: split.user_id,
            recipient_type: 'user',
            amount: split.amount,
            percentage: split.percentage || null,
            split_type: split.percentage ? 'percentage' : 'fixed_amount',
            status: 'pending',
            created_at: new Date(),
          };

          // Adicionar booking_id e user_id se as colunas existirem (após migration 019)
          const hasBookingId = await trx.schema.hasColumn('payment_splits', 'booking_id');
          if (hasBookingId) {
            splitData.booking_id = bookingId;
          }

          const hasUserId = await trx.schema.hasColumn('payment_splits', 'user_id');
          if (hasUserId) {
            splitData.user_id = split.user_id;
          }

          const [record] = await trx("payment_splits").insert(splitData).returning("*");

          return record;
        })
      );

      // Enviar notificações
      for (const split of splitRecords) {
        try {
          await notificationService.notifySplitPaymentCreated(split.id, split.user_id);
        } catch (error) {
          logger.warn('Erro ao enviar notificação de split payment', { 
            splitId: split.id, 
            error: error.message 
          });
        }
      }

      logger.info('Split payment criado', { bookingId, splitsCount: splitRecords.length });

      return {
        booking_id: bookingId,
        total_amount: totalAmount,
        splits: splitRecords,
        status: 'pending',
      };
    });
  } catch (error) {
    logger.error('Erro ao criar split payment', { bookingId, error: error.message });
    throw error;
  }
}

/**
 * Obter splits de uma reserva
 */
async function getBookingSplits(bookingId) {
  try {
    // Buscar payment da reserva
    const payment = await db("payments")
      .where("booking_id", bookingId)
      .first();

    if (!payment) {
      return [];
    }

    // Buscar splits usando payment_id ou booking_id
    let query = db("payment_splits")
      .select(
        "payment_splits.*",
        "users.name as user_name",
        "users.email as user_email"
      )
      .leftJoin("users", "payment_splits.recipient_id", "users.id");

    // Verificar se booking_id existe na tabela
    const hasBookingId = await db.schema.hasColumn('payment_splits', 'booking_id');
    if (hasBookingId) {
      query = query.where("payment_splits.booking_id", bookingId);
    } else {
      query = query.where("payment_splits.payment_id", payment.id);
    }

    const splits = await query.orderBy("payment_splits.created_at", "asc");

    return splits.map(split => ({
      id: split.id,
      booking_id: split.booking_id,
      user_id: split.user_id,
      amount: parseFloat(split.amount || 0),
      percentage: split.percentage ? parseFloat(split.percentage) : null,
      status: split.status,
      paid_at: split.paid_at,
      payment_method: split.payment_method,
      created_at: split.created_at,
      user: {
        name: split.user_name,
        email: split.user_email,
      },
    }));
  } catch (error) {
    logger.error('Erro ao obter splits da reserva', { bookingId, error: error.message });
    throw error;
  }
}

/**
 * Marcar split como pago
 */
async function markAsPaid(splitId, paymentData) {
  try {
    return await withTransaction(async (trx) => {
      const split = await trx("payment_splits")
        .where("id", splitId)
        .first();

      if (!split) {
        throw new Error("Split payment não encontrado");
      }

      if (split.status === 'paid' || split.status === 'completed') {
        return split; // Já está pago
      }

      // Atualizar split
      const updateData = {
        status: 'completed', // Usar 'completed' se 'paid' não existir
        updated_at: new Date(),
      };

      // Adicionar campos se existirem
      const hasPaidAt = await trx.schema.hasColumn('payment_splits', 'paid_at');
      if (hasPaidAt) {
        updateData.paid_at = new Date();
      }

      const hasPaymentMethod = await trx.schema.hasColumn('payment_splits', 'payment_method');
      if (hasPaymentMethod) {
        updateData.payment_method = paymentData.method || null;
      }

      // Verificar se status 'paid' existe, senão usar 'completed'
      await trx("payment_splits")
        .where("id", splitId)
        .update(updateData);

      // Buscar payment para obter booking_id
      const payment = await trx("payments")
        .where("id", split.payment_id)
        .first();

      if (!payment) {
        throw new Error("Payment não encontrado");
      }

      // Buscar todos os splits do mesmo payment
      const allSplits = await trx("payment_splits")
        .where("payment_id", split.payment_id);

      // Verificar status (pode ser 'paid' ou 'completed')
      const allPaid = allSplits.every(s => 
        (s.status === 'paid' || s.status === 'completed') || s.id === splitId
      );
      const somePaid = allSplits.some(s => 
        (s.status === 'paid' || s.status === 'completed') || s.id === splitId
      );

      // Atualizar status da reserva se necessário
      if (allPaid) {
        await trx("bookings")
          .where("id", payment.booking_id)
          .update({
            payment_status: 'paid',
            updated_at: new Date(),
          });
      } else if (somePaid) {
        await trx("bookings")
          .where("id", payment.booking_id)
          .update({
            payment_status: 'partial',
            updated_at: new Date(),
          });
      }

      // Enviar notificação
      try {
        await notificationService.notifySplitPaymentPaid(splitId, split.user_id);
      } catch (error) {
        logger.warn('Erro ao enviar notificação de pagamento', { 
          splitId, 
          error: error.message 
        });
      }

      const updatedSplit = await trx("payment_splits")
        .where("id", splitId)
        .first();

      logger.info('Split marcado como pago', { splitId, bookingId: payment.booking_id });

      return updatedSplit;
    });
  } catch (error) {
    logger.error('Erro ao marcar split como pago', { splitId, error: error.message });
    throw error;
  }
}

/**
 * Obter status de splits de uma reserva
 */
async function getSplitStatus(bookingId) {
  try {
    // Buscar payment da reserva
    const payment = await db("payments")
      .where("booking_id", bookingId)
      .first();

    if (!payment) {
      return {
        booking_id: bookingId,
        total: 0,
        paid: 0,
        pending: 0,
        percentage: 0,
        splits_count: 0,
        paid_count: 0,
        pending_count: 0,
      };
    }

    // Buscar splits usando payment_id ou booking_id
    let query = db("payment_splits");
    const hasBookingId = await db.schema.hasColumn('payment_splits', 'booking_id');
    if (hasBookingId) {
      query = query.where("payment_splits.booking_id", bookingId);
    } else {
      query = query.where("payment_splits.payment_id", payment.id);
    }

    const splits = await query;

    const total = splits.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
    const paid = splits
      .filter(s => s.status === 'paid' || s.status === 'completed')
      .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
    const pending = total - paid;
    const percentage = total > 0 ? (paid / total) * 100 : 0;

    return {
      booking_id: bookingId,
      total,
      paid,
      pending,
      percentage: Math.round(percentage * 100) / 100,
      splits_count: splits.length,
      paid_count: splits.filter(s => s.status === 'paid' || s.status === 'completed').length,
      pending_count: splits.filter(s => s.status === 'pending').length,
    };
  } catch (error) {
    logger.error('Erro ao obter status de splits', { bookingId, error: error.message });
    throw error;
  }
}

/**
 * Calcular splits automaticamente se necessário
 */
function calculateSplits(totalAmount, splits) {
  // Se todos os splits têm amount, usar diretamente
  if (splits.every(s => s.amount !== undefined && s.amount !== null)) {
    return splits.map(s => ({
      user_id: s.user_id,
      amount: parseFloat(s.amount),
      percentage: (parseFloat(s.amount) / totalAmount) * 100,
    }));
  }

  // Se todos têm percentage, calcular amounts
  if (splits.every(s => s.percentage !== undefined && s.percentage !== null)) {
    const totalPercentage = splits.reduce((sum, s) => sum + parseFloat(s.percentage), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error(`Soma das porcentagens deve ser 100%, mas é ${totalPercentage}%`);
    }

    return splits.map(s => ({
      user_id: s.user_id,
      amount: Math.round((totalAmount * parseFloat(s.percentage) / 100) * 100) / 100,
      percentage: parseFloat(s.percentage),
    }));
  }

  // Dividir igualmente
  const equalAmount = Math.round((totalAmount / splits.length) * 100) / 100;
  const calculated = splits.map((s, index) => {
    // Último split recebe o restante para compensar arredondamentos
    if (index === splits.length - 1) {
      const previousTotal = equalAmount * (splits.length - 1);
      return {
        user_id: s.user_id,
        amount: Math.round((totalAmount - previousTotal) * 100) / 100,
        percentage: Math.round(((totalAmount - previousTotal) / totalAmount) * 100 * 100) / 100,
      };
    }
    return {
      user_id: s.user_id,
      amount: equalAmount,
      percentage: Math.round((equalAmount / totalAmount) * 100 * 100) / 100,
    };
  });

  return calculated;
}

/**
 * Validar splits
 */
function validateSplits(splits) {
  if (!Array.isArray(splits) || splits.length === 0) {
    throw new Error("Splits deve ser um array não vazio");
  }

  if (splits.length > 20) {
    throw new Error("Máximo de 20 splits por reserva");
  }

  for (const split of splits) {
    if (!split.user_id) {
      throw new Error("Cada split deve ter user_id");
    }

    if (split.amount !== undefined && split.amount !== null) {
      if (parseFloat(split.amount) <= 0) {
        throw new Error("Amount deve ser positivo");
      }
    }

    if (split.percentage !== undefined && split.percentage !== null) {
      if (parseFloat(split.percentage) < 0 || parseFloat(split.percentage) > 100) {
        throw new Error("Percentage deve estar entre 0 e 100");
      }
    }

    if (split.amount === undefined && split.percentage === undefined) {
      // Permitir - será calculado igualmente
    }
  }
}

module.exports = {
  createSplitPayment,
  getBookingSplits,
  markAsPaid,
  getSplitStatus,
};

