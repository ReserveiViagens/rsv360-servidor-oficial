/**
 * 💳 Payment Service
 * FASE 1: Serviço de pagamentos com integração de gateways
 * Gerencia processamento, confirmação e reembolsos de pagamentos
 */

const { db, withTransaction } = require("../config/database");
const { createGateway, isGatewaySupported } = require("./paymentGatewayFactory");
const notificationService = require("./notificationService");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ service: 'paymentService' });

/**
 * Processar pagamento (criar e processar no gateway)
 * 
 * Cria um pagamento e processa no gateway de pagamento escolhido.
 * Valida splits se fornecidos e atualiza automaticamente o status da reserva.
 * Executa dentro de uma transação ACID para garantir consistência.
 * 
 * @param {Object} paymentData - Dados do pagamento
 * @param {number} paymentData.booking_id - ID da reserva (obrigatório)
 * @param {number} paymentData.user_id - ID do usuário (obrigatório)
 * @param {number} paymentData.amount - Valor do pagamento em centavos (obrigatório)
 * @param {string} [paymentData.currency='BRL'] - Moeda (padrão: BRL)
 * @param {string} paymentData.payment_method - Método de pagamento (credit_card, debit_card, pix, boleto)
 * @param {string} [paymentData.gateway='stripe'] - Gateway (stripe, mercado_pago)
 * @param {Object} [paymentData.card_data] - Dados do cartão (obrigatório para credit_card/debit_card)
 * @param {string} paymentData.card_data.number - Número do cartão
 * @param {number} paymentData.card_data.exp_month - Mês de expiração (1-12)
 * @param {number} paymentData.card_data.exp_year - Ano de expiração
 * @param {string} paymentData.card_data.cvv - CVV do cartão
 * @param {string} paymentData.card_data.holder_name - Nome do portador
 * @param {Array<Object>} [paymentData.splits] - Array de splits para divisão de pagamento (opcional)
 * @param {number} paymentData.splits[].recipient_id - ID do recebedor
 * @param {number} [paymentData.splits[].amount] - Valor fixo (se split_type = 'fixed_amount')
 * @param {number} [paymentData.splits[].percentage] - Porcentagem (se split_type = 'percentage')
 * @param {string} paymentData.splits[].split_type - Tipo: 'percentage' ou 'fixed_amount'
 * @param {Object} [paymentData.metadata] - Metadados adicionais
 * @returns {Promise<Object>} Pagamento processado com status e transaction_id
 * 
 * @example
 * const payment = await paymentService.processPayment({
 *   booking_id: 1,
 *   user_id: 101,
 *   amount: 50000, // R$ 500,00 em centavos
 *   currency: 'BRL',
 *   payment_method: 'credit_card',
 *   gateway: 'stripe',
 *   card_data: {
 *     number: '4242424242424242',
 *     exp_month: 12,
 *     exp_year: 2025,
 *     cvv: '123',
 *     holder_name: 'John Doe'
 *   }
 * });
 * 
 * @throws {Error} Quando reserva não encontrada, gateway não suportado, ou erro no processamento
 * @throws {Error} Quando soma dos splits excede o valor total
 * 
 * @since FASE 1
 */
async function processPayment(paymentData) {
  try {
    const {
      booking_id,
      user_id,
      amount,
      currency = "BRL",
      payment_method,
      gateway = "stripe",
      card_data,
      splits,
      metadata,
    } = paymentData;
    
    // Verificar se booking existe
    const booking = await db("bookings").where("id", booking_id).first();
    if (!booking) {
      throw new Error("Reserva não encontrada");
    }
    
    // Validar splits se houver
    if (splits && splits.length > 0) {
      const splitTotal = splits.reduce((sum, split) => {
        if (split.split_type === "percentage") {
          return sum + (amount * split.percentage) / 100;
        } else {
          return sum + split.amount;
        }
      }, 0);
      
      // Validar que soma dos splits não excede o valor total
      if (splitTotal > amount) {
        throw new Error("Soma dos splits não pode exceder o valor total");
      }
    }
    
    // Processar pagamento dentro de transação
    const payment = await withTransaction(async (trx) => {
      // Gerar transaction_id temporário
      const tempTransactionId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Criar registro de pagamento
      const [newPayment] = await trx("payments")
        .insert({
          booking_id: booking_id,
          user_id: user_id,
          transaction_id: tempTransactionId,
          amount: amount,
          currency: currency,
          method: payment_method,
          gateway_provider: gateway,
          status: "pending",
          net_amount: amount, // Será ajustado após taxas
          card_last_four: card_data?.number ? card_data.number.slice(-4) : null,
          card_brand: null, // Será preenchido pelo gateway
          metadata: metadata ? JSON.stringify(metadata) : null,
          gateway_response: card_data ? JSON.stringify({ card_data }) : null,
        })
        .returning("*");
      
      // Processar splits se houver (tabela payment_splits será criada em migration futura)
      // Por enquanto, apenas validar
      // TODO: Criar registros de split quando migration payment_splits for criada
      // if (splits && splits.length > 0) {
      //   await trx("payment_splits").insert({...});
      // }
      
      // Integrar com gateway real usando Factory Pattern
      let gatewayResult;
      try {
        // Validar gateway
        if (!isGatewaySupported(gateway)) {
          throw new Error(`Gateway '${gateway}' não é suportado`);
        }
        
        // Criar instância do gateway
        const paymentGateway = createGateway(gateway);
        
        // Preparar dados para o gateway
        const gatewayPaymentData = {
          amount: amount,
          currency: currency,
          payment_method_id: payment_method, // Stripe/Mercado Pago podem precisar de tratamento diferente
          description: `Pagamento para reserva #${booking.booking_number || booking_id}`,
          payer_email: booking.customer_email || null,
          card_data: card_data,
          metadata: {
            ...metadata,
            booking_id: booking_id.toString(),
            booking_number: booking.booking_number,
            user_id: user_id?.toString(),
          },
        };
        
        // Criar pagamento no gateway
        gatewayResult = await paymentGateway.createPayment(gatewayPaymentData);
        
        // Atualizar pagamento com transaction_id e gateway_transaction_id
        await trx("payments")
          .where("id", newPayment.id)
          .update({
            transaction_id: gatewayResult.transaction_id,
            gateway_transaction_id: gatewayResult.transaction_id,
            status: gatewayResult.status === 'confirmed' ? 'confirmed' : 'processing',
            card_brand: gatewayResult.metadata?.card_brand || null,
            gateway_response: JSON.stringify(gatewayResult),
          });
        
        const updatedPayment = await trx("payments")
          .where("id", newPayment.id)
          .first();
        
        return updatedPayment;
      } catch (gatewayError) {
        logger.error('Erro ao processar pagamento no gateway', { 
          paymentId: newPayment.id, 
          gateway, 
          error: gatewayError.message 
        });
        
        // Atualizar status para failed
        await trx("payments")
          .where("id", newPayment.id)
          .update({
            status: "failed",
            gateway_response: JSON.stringify({ error: gatewayError.message }),
          });
        
        throw gatewayError;
      }
    });
    
    // Atualizar status da reserva
    await db("bookings")
      .where("id", booking_id)
      .update({
        payment_status: payment.status === 'confirmed' ? 'paid' : 'partial',
        updated_at: new Date(),
      });
    
    logger.info('Pagamento processado', { paymentId: payment.id, bookingId: booking_id });
    
    return payment;
  } catch (error) {
    logger.error('Erro ao processar pagamento', { paymentData, error: error.message });
    throw error;
  }
}

/**
 * Obter pagamento por ID
 * 
 * Retorna pagamento com dados parseados (metadata, gateway_response).
 * Opcionalmente inclui splits quando migration payment_splits estiver disponível.
 * 
 * @param {number} id - ID do pagamento
 * @param {boolean} [includeSplits=true] - Incluir splits (quando migration estiver disponível)
 * @returns {Promise<Object|null>} Pagamento com dados parseados ou null se não encontrado
 * @returns {Promise<Array>} returns.splits - Array de splits (vazio se não disponível)
 * 
 * @example
 * const payment = await paymentService.getPaymentById(1);
 * console.log(payment.metadata); // Objeto parseado
 * console.log(payment.gateway_response); // Objeto parseado
 * 
 * @throws {Error} Quando ocorre erro ao acessar banco de dados
 * 
 * @since FASE 1
 */
async function getPaymentById(id, includeSplits = true) {
  try {
    const payment = await db("payments")
      .select(
        "payments.*",
        "bookings.booking_number",
        "bookings.total_amount as booking_total",
      )
      .leftJoin("bookings", "payments.booking_id", "bookings.id")
      .where("payments.id", parseInt(id))
      .first();
    
    if (!payment) {
      return null;
    }
    
    const result = {
      ...payment,
      metadata: payment.metadata ? JSON.parse(payment.metadata) : null,
      gateway_response: payment.gateway_response
        ? JSON.parse(payment.gateway_response)
        : null,
    };
    
    // Buscar splits se solicitado (tabela payment_splits será criada em migration futura)
    if (includeSplits) {
      // Por enquanto, retornar array vazio
      result.splits = [];
      // TODO: Descomentar quando migration payment_splits for criada
      // const splits = await db("payment_splits")
      //   .select(
      //     "payment_splits.*",
      //     "users.name as recipient_name",
      //     "users.email as recipient_email",
      //   )
      //   .leftJoin("users", "payment_splits.recipient_id", "users.id")
      //   .where("payment_splits.payment_id", payment.id);
      // result.splits = splits;
    }
    
    return result;
  } catch (error) {
    logger.error('Erro ao obter pagamento', { id, error: error.message });
    throw error;
  }
}

/**
 * Buscar pagamentos com filtros e paginação
 * 
 * Busca pagamentos com filtros opcionais e retorna resultado paginado.
 * 
 * @param {Object} [filters={}] - Filtros de busca
 * @param {number} [filters.booking_id] - Filtrar por ID da reserva
 * @param {string} [filters.status] - Filtrar por status (pending, processing, completed, confirmed, failed, refunded)
 * @param {string} [filters.gateway] - Filtrar por gateway (stripe, mercado_pago)
 * @param {number} [filters.page=1] - Página (inicia em 1)
 * @param {number} [filters.limit=20] - Limite por página
 * @returns {Promise<Object>} Objeto com pagamentos e paginação
 * @returns {Promise<Array>} returns.payments - Lista de pagamentos encontrados
 * @returns {Promise<Object>} returns.pagination - Informações de paginação
 * 
 * @example
 * const result = await paymentService.searchPayments({
 *   booking_id: 1,
 *   status: 'completed',
 *   page: 1,
 *   limit: 20
 * });
 * 
 * @throws {Error} Quando ocorre erro ao acessar banco de dados
 * 
 * @since FASE 1
 */
async function searchPayments(filters = {}) {
  try {
    const {
      booking_id,
      status,
      gateway,
      page = 1,
      limit = 20,
    } = filters;
    
    let query = db("payments")
      .select(
        "payments.*",
        "bookings.booking_number",
        "bookings.total_amount as booking_total",
      )
      .leftJoin("bookings", "payments.booking_id", "bookings.id")
      .orderBy("payments.created_at", "desc");
    
    // Filtros
    if (booking_id) {
      query = query.where("payments.booking_id", parseInt(booking_id));
    }
    if (status) {
      query = query.where("payments.status", status);
    }
    if (gateway) {
      query = query.where("payments.gateway_provider", gateway);
    }
    
    // Paginação
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const payments = await query.limit(parseInt(limit)).offset(offset);
    
    // Total de registros
    let totalQuery = db("payments");
    if (booking_id) totalQuery = totalQuery.where("booking_id", parseInt(booking_id));
    if (status) totalQuery = totalQuery.where("status", status);
    if (gateway) totalQuery = totalQuery.where("gateway_provider", gateway);
    const total = await totalQuery.count("* as count").first();
    
    return {
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total.count),
        totalPages: Math.ceil(total.count / parseInt(limit)),
      },
    };
  } catch (error) {
    logger.error('Erro ao buscar pagamentos', { filters, error: error.message });
    throw error;
  }
}

/**
 * Obter pagamentos por reserva
 * 
 * Retorna todos os pagamentos de uma reserva específica, ordenados por data de criação (mais recente primeiro).
 * 
 * @param {number} bookingId - ID da reserva
 * @returns {Promise<Array>} Lista de pagamentos da reserva
 * 
 * @example
 * const payments = await paymentService.getPaymentsByBooking(1);
 * const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
 * 
 * @throws {Error} Quando ocorre erro ao acessar banco de dados
 * 
 * @since FASE 1
 */
async function getPaymentsByBooking(bookingId) {
  try {
    const payments = await db("payments")
      .where("booking_id", parseInt(bookingId))
      .orderBy("created_at", "desc");
    
    return payments;
  } catch (error) {
    logger.error('Erro ao obter pagamentos por reserva', { bookingId, error: error.message });
    throw error;
  }
}

/**
 * Confirmar pagamento (webhook ou manual)
 * 
 * Confirma um pagamento, integrando com o gateway se disponível.
 * Atualiza automaticamente o status da reserva para "paid" e envia notificação.
 * 
 * @param {number} id - ID do pagamento
 * @param {string} [transaction_id] - ID da transação do gateway (opcional, usado se gateway_transaction_id não existir)
 * @param {Object} [gateway_response] - Resposta do gateway (opcional, usado se gateway não disponível)
 * @returns {Promise<Object>} Pagamento confirmado
 * 
 * @example
 * // Confirmação manual
 * await paymentService.confirmPayment(1);
 * 
 * // Confirmação via webhook
 * await paymentService.confirmPayment(1, 'txn_123', { status: 'confirmed' });
 * 
 * @throws {Error} Quando pagamento não encontrado ou erro ao confirmar no gateway
 * 
 * @since FASE 1
 */
async function confirmPayment(id, transaction_id = null, gateway_response = null) {
  try {
    const payment = await db("payments").where("id", parseInt(id)).first();
    if (!payment) {
      throw new Error("Pagamento não encontrado");
    }
    
    // Integrar com gateway real para confirmar pagamento
    if (payment.gateway_transaction_id && payment.gateway_provider) {
      try {
        if (!isGatewaySupported(payment.gateway_provider)) {
          throw new Error(`Gateway '${payment.gateway_provider}' não é suportado`);
        }
        
        const paymentGateway = createGateway(payment.gateway_provider);
        const gatewayResult = await paymentGateway.confirmPayment(payment.gateway_transaction_id);
        
        // Atualizar status baseado no resultado do gateway
        await db("payments")
          .where("id", parseInt(id))
          .update({
            status: gatewayResult.status === 'confirmed' ? 'confirmed' : 'completed',
            gateway_transaction_id: transaction_id || payment.gateway_transaction_id,
            gateway_response: JSON.stringify(gatewayResult),
            processed_at: new Date(),
            updated_at: new Date(),
          });
      } catch (gatewayError) {
        logger.error('Erro ao confirmar pagamento no gateway', { 
          paymentId: id, 
          error: gatewayError.message 
        });
        // Continuar com atualização local mesmo se gateway falhar
        await db("payments")
          .where("id", parseInt(id))
          .update({
            status: "completed",
            gateway_transaction_id: transaction_id || payment.gateway_transaction_id,
            gateway_response: gateway_response ? JSON.stringify(gateway_response) : null,
            processed_at: new Date(),
            updated_at: new Date(),
          });
      }
    } else {
      // Se não tem gateway_transaction_id, apenas atualizar status local
      await db("payments")
        .where("id", parseInt(id))
        .update({
          status: "completed",
          gateway_transaction_id: transaction_id || payment.gateway_transaction_id,
          gateway_response: gateway_response ? JSON.stringify(gateway_response) : null,
          processed_at: new Date(),
          updated_at: new Date(),
        });
    }
    
    // Atualizar booking
    await db("bookings")
      .where("id", payment.booking_id)
      .update({
        payment_status: "paid",
        paid_amount: payment.amount,
        updated_at: new Date(),
      });
    
    // Notificar confirmação de pagamento (em background)
    notificationService.notifyPaymentConfirmed(payment.id).catch((err) => {
      logger.error('Erro ao enviar notificação', { paymentId: payment.id, error: err.message });
    });
    
    logger.info('Pagamento confirmado', { paymentId: id });
    
    return await getPaymentById(id);
  } catch (error) {
    logger.error('Erro ao confirmar pagamento', { id, error: error.message });
    throw error;
  }
}

/**
 * Reembolsar pagamento
 * 
 * Processa reembolso completo ou parcial de um pagamento.
 * Integra com gateway se disponível e atualiza automaticamente o status da reserva.
 * Apenas pagamentos com status "completed" ou "confirmed" podem ser reembolsados.
 * 
 * @param {number} id - ID do pagamento
 * @param {number} [amount] - Valor do reembolso em centavos (opcional, padrão: valor total do pagamento)
 * @param {string} [reason] - Motivo do reembolso (opcional, padrão: 'requested_by_customer')
 * @returns {Promise<Object>} Resultado do reembolso
 * @returns {Promise<boolean>} returns.success - Se reembolso foi processado com sucesso
 * @returns {Promise<number>} returns.refund_amount - Valor reembolsado
 * @returns {Promise<Object>} returns.payment - Pagamento atualizado
 * 
 * @example
 * // Reembolso total
 * const result = await paymentService.refundPayment(1);
 * 
 * // Reembolso parcial
 * const result = await paymentService.refundPayment(1, 25000, 'partial_refund');
 * 
 * @throws {Error} Quando pagamento não encontrado ou não está completo
 * @throws {Error} Quando gateway retorna erro de reembolso indisponível
 * 
 * @since FASE 1
 */
async function refundPayment(id, amount = null, reason = null) {
  try {
    const payment = await db("payments").where("id", parseInt(id)).first();
    if (!payment) {
      throw new Error("Pagamento não encontrado");
    }
    
    if (payment.status !== "completed" && payment.status !== "confirmed") {
      throw new Error("Apenas pagamentos completos podem ser reembolsados");
    }
    
    const refundAmount = amount || payment.amount;
    
    // Integrar com gateway real para reembolso
    if (payment.gateway_transaction_id && payment.gateway_provider) {
      try {
        if (!isGatewaySupported(payment.gateway_provider)) {
          throw new Error(`Gateway '${payment.gateway_provider}' não é suportado`);
        }
        
        const paymentGateway = createGateway(payment.gateway_provider);
        const refundResult = await paymentGateway.refundPayment(payment.gateway_transaction_id, {
          amount: refundAmount,
          reason: reason || 'requested_by_customer',
        });
        
        // Atualizar com resultado do reembolso
        await db("payments")
          .where("id", parseInt(id))
          .update({
            status: "refunded",
            refund_reason: reason || null,
            refunded_at: new Date(),
            gateway_response: JSON.stringify(refundResult),
            updated_at: new Date(),
          });
      } catch (gatewayError) {
        logger.error('Erro ao reembolsar no gateway', { 
          paymentId: id, 
          error: gatewayError.message 
        });
        
        // Tratamento de erros específicos
        if (gatewayError.message.includes("REEMBOLSO_INDISPONIVEL")) {
          throw new Error("Reembolso não disponível");
        }
        
        throw gatewayError; // Re-throw para tratamento geral
      }
    } else {
      // Se não tem gateway_transaction_id, apenas atualizar status local
      await db("payments")
        .where("id", parseInt(id))
        .update({
          status: "refunded",
          refund_reason: reason || null,
          refunded_at: new Date(),
          updated_at: new Date(),
        });
    }
    
    // Atualizar booking
    await db("bookings")
      .where("id", payment.booking_id)
      .update({
        payment_status: "refunded",
        updated_at: new Date(),
      });
    
    logger.info('Pagamento reembolsado', { paymentId: id, refundAmount });
    
    return {
      success: true,
      refund_amount: refundAmount,
      payment: await getPaymentById(id),
    };
  } catch (error) {
    logger.error('Erro ao reembolsar pagamento', { id, amount, reason, error: error.message });
    throw error;
  }
}

/**
 * Atualizar status do pagamento
 * 
 * Método auxiliar para atualizar o status de um pagamento.
 * Útil para atualizações manuais ou correções de status.
 * 
 * @param {number} id - ID do pagamento
 * @param {string} status - Novo status (pending, processing, completed, confirmed, failed, refunded)
 * @returns {Promise<Object>} Pagamento atualizado
 * 
 * @example
 * await paymentService.updatePaymentStatus(1, 'failed');
 * 
 * @throws {Error} Quando ocorre erro ao atualizar no banco de dados
 * 
 * @since FASE 1
 */
async function updatePaymentStatus(id, status) {
  try {
    await db("payments")
      .where("id", parseInt(id))
      .update({
        status: status,
        updated_at: new Date(),
      });
    
    logger.info('Status do pagamento atualizado', { paymentId: id, status });
    
    return await getPaymentById(id);
  } catch (error) {
    logger.error('Erro ao atualizar status do pagamento', { id, status, error: error.message });
    throw error;
  }
}

module.exports = {
  processPayment,
  getPaymentById,
  searchPayments,
  getPaymentsByBooking,
  confirmPayment,
  refundPayment,
  updatePaymentStatus,
};

