/**
 * 💳 Mercado Pago Payment Service
 * FASE B3.2: Integração com Mercado Pago para processamento de pagamentos
 * Suporta cartão de crédito, débito, PIX, boleto e outros métodos
 */

const { MercadoPagoConfig, Payment, PaymentMethod } = require('mercadopago');

// Inicializar cliente Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
  options: {
    timeout: 20000,
    idempotencyKey: 'rsv360',
  },
});

const payment = new Payment(client);
const paymentMethod = new PaymentMethod(client);

/**
 * Criar pagamento no Mercado Pago
 * @param {Object} paymentData - Dados do pagamento
 * @param {number} paymentData.amount - Valor em reais (ex: 100.00 = R$ 100,00)
 * @param {string} paymentData.payment_method_id - ID do método de pagamento
 * @param {string} paymentData.description - Descrição do pagamento
 * @param {string} paymentData.payer_email - Email do pagador
 * @param {Object} paymentData.card_data - Dados do cartão (se aplicável)
 * @param {Object} paymentData.metadata - Metadados adicionais
 * @returns {Promise<Object>} Pagamento criado
 */
async function createPayment(paymentData) {
  try {
    const {
      amount,
      payment_method_id,
      description,
      payer_email,
      card_data,
      metadata = {},
    } = paymentData;

    // Validar valor mínimo
    if (amount < 0.5) {
      // Mínimo R$ 0,50
      throw new Error('VALOR_MINIMO: Valor mínimo é R$ 0,50');
    }

    // Preparar dados do pagamento
    const paymentRequest = {
      transaction_amount: parseFloat(amount.toFixed(2)),
      description: description || 'Pagamento RSV 360',
      payment_method_id: payment_method_id,
      payer: {
        email: payer_email,
      },
      metadata: {
        ...metadata,
        source: 'rsv360',
        created_at: new Date().toISOString(),
      },
    };

    // Adicionar dados do cartão se for cartão de crédito/débito
    if (card_data && (payment_method_id === 'credit_card' || payment_method_id === 'debit_card')) {
      paymentRequest.token = card_data.token; // Token do cartão (deve ser gerado via frontend)
      paymentRequest.installments = card_data.installments || 1;
      paymentRequest.issuer_id = card_data.issuer_id;
    }

    // Criar pagamento
    const createdPayment = await payment.create({ body: paymentRequest });

    return {
      success: createdPayment.status === 'approved' || createdPayment.status === 'pending',
      payment_id: createdPayment.id.toString(),
      status: mapMercadoPagoStatus(createdPayment.status),
      status_detail: createdPayment.status_detail,
      amount: createdPayment.transaction_amount,
      currency: createdPayment.currency_id || 'BRL',
      payment_method_id: createdPayment.payment_method_id,
      metadata: createdPayment.metadata,
    };
  } catch (error) {
    throw mapMercadoPagoError(error);
  }
}

/**
 * Confirmar pagamento no Mercado Pago
 * @param {string} paymentId - ID do pagamento
 * @returns {Promise<Object>} Pagamento confirmado
 */
async function confirmPayment(paymentId) {
  try {
    const paymentData = await payment.get({ id: paymentId });

    return {
      success: paymentData.status === 'approved',
      payment_id: paymentData.id.toString(),
      status: mapMercadoPagoStatus(paymentData.status),
      status_detail: paymentData.status_detail,
      amount: paymentData.transaction_amount,
      currency: paymentData.currency_id || 'BRL',
      metadata: paymentData.metadata,
    };
  } catch (error) {
    throw mapMercadoPagoError(error);
  }
}

/**
 * Reembolsar pagamento no Mercado Pago
 * @param {string} paymentId - ID do pagamento
 * @param {Object} options - Opções de reembolso
 * @param {number} options.amount - Valor a reembolsar (opcional, reembolsa total se não informado)
 * @returns {Promise<Object>} Reembolso criado
 */
async function refundPayment(paymentId, options = {}) {
  try {
    // Buscar pagamento primeiro
    const paymentData = await payment.get({ id: paymentId });

    if (paymentData.status !== 'approved') {
      throw new Error('REEMBOLSO_INDISPONIVEL: Pagamento não está aprovado para reembolso');
    }

    // Criar reembolso (Mercado Pago usa Payment.refund)
    const refundData = await payment.refund({
      id: paymentId,
      body: {
        amount: options.amount ? parseFloat(options.amount.toFixed(2)) : undefined, // Reembolso total se não informado
      },
    });

    return {
      success: true,
      refund_id: refundData.id.toString(),
      amount: refundData.amount,
      currency: refundData.currency_id || 'BRL',
      status: refundData.status,
      payment_id: paymentId,
    };
  } catch (error) {
    throw mapMercadoPagoError(error);
  }
}

/**
 * Buscar pagamento no Mercado Pago
 * @param {string} paymentId - ID do pagamento
 * @returns {Promise<Object>} Pagamento
 */
async function getPayment(paymentId) {
  try {
    const paymentData = await payment.get({ id: paymentId });

    return {
      success: true,
      payment_id: paymentData.id.toString(),
      status: mapMercadoPagoStatus(paymentData.status),
      status_detail: paymentData.status_detail,
      amount: paymentData.transaction_amount,
      currency: paymentData.currency_id || 'BRL',
      payment_method_id: paymentData.payment_method_id,
      metadata: paymentData.metadata,
      date_created: paymentData.date_created,
    };
  } catch (error) {
    throw mapMercadoPagoError(error);
  }
}

/**
 * Mapear status do Mercado Pago para status padronizado
 * @param {string} mercadoPagoStatus - Status do Mercado Pago
 * @returns {string} Status padronizado
 */
function mapMercadoPagoStatus(mercadoPagoStatus) {
  const statusMap = {
    pending: 'pending',
    approved: 'confirmed',
    authorized: 'confirmed',
    in_process: 'pending',
    in_mediation: 'pending',
    rejected: 'failed',
    cancelled: 'cancelled',
    refunded: 'refunded',
    charged_back: 'chargeback',
  };

  return statusMap[mercadoPagoStatus] || mercadoPagoStatus;
}

/**
 * Mapear erros do Mercado Pago para erros padronizados
 * @param {Error} error - Erro do Mercado Pago
 * @returns {Error} Erro mapeado
 */
function mapMercadoPagoError(error) {
  // Erros específicos do Mercado Pago
  if (error.message && error.message.includes('card')) {
    return new Error(`CARTAO_RECUSADO: ${error.message}`);
  }

  if (error.status === 429) {
    return new Error(`RATE_LIMIT: Muitas requisições. Tente novamente em alguns instantes.`);
  }

  if (error.status === 400) {
    return new Error(`REQUISICAO_INVALIDA: ${error.message || 'Dados inválidos'}`);
  }

  if (error.status === 401) {
    return new Error(`ERRO_AUTENTICACAO_MERCADO_PAGO: Token de acesso inválido.`);
  }

  if (error.status === 500 || error.status === 502 || error.status === 503) {
    return new Error(`ERRO_API_MERCADO_PAGO: Erro no servidor do Mercado Pago.`);
  }

  // Erro genérico
  return new Error(`ERRO_MERCADO_PAGO: ${error.message || 'Erro desconhecido'}`);
}

module.exports = {
  createPayment,
  confirmPayment,
  refundPayment,
  getPayment,
  mapMercadoPagoStatus,
  mapMercadoPagoError,
};

