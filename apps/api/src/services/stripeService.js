/**
 * 💳 Stripe Payment Service
 * FASE B3.1: Integração com Stripe para processamento de pagamentos
 * Suporta cartão de crédito, débito e outros métodos
 */

const Stripe = require('stripe');

// Inicializar cliente Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
  maxNetworkRetries: 3,
  timeout: 20000,
});

/**
 * Criar pagamento no Stripe
 * @param {Object} paymentData - Dados do pagamento
 * @param {number} paymentData.amount - Valor em centavos (ex: 10000 = R$ 100,00)
 * @param {string} paymentData.currency - Moeda (padrão: 'brl')
 * @param {string} paymentData.payment_method_id - ID do método de pagamento
 * @param {string} paymentData.customer_id - ID do cliente no Stripe (opcional)
 * @param {string} paymentData.description - Descrição do pagamento
 * @param {Object} paymentData.metadata - Metadados adicionais
 * @returns {Promise<Object>} PaymentIntent do Stripe
 */
async function createPayment(paymentData) {
  try {
    const {
      amount,
      currency = 'brl',
      payment_method_id,
      customer_id,
      description,
      metadata = {},
    } = paymentData;

    // Validar valor mínimo
    if (amount < 50) {
      // Mínimo R$ 0,50
      throw new Error('VALOR_MINIMO: Valor mínimo é R$ 0,50');
    }

    // Criar PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Garantir que é inteiro
      currency: currency.toLowerCase(),
      payment_method: payment_method_id,
      customer: customer_id,
      description: description || 'Pagamento RSV 360',
      metadata: {
        ...metadata,
        source: 'rsv360',
        created_at: new Date().toISOString(),
      },
      confirmation_method: 'manual',
      confirm: false, // Não confirmar automaticamente
    });

    return {
      success: true,
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
    };
  } catch (error) {
    throw mapStripeError(error);
  }
}

/**
 * Confirmar pagamento no Stripe
 * @param {string} paymentIntentId - ID do PaymentIntent
 * @returns {Promise<Object>} PaymentIntent confirmado
 */
async function confirmPayment(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);

    return {
      success: paymentIntent.status === 'succeeded',
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      charges: paymentIntent.charges?.data || [],
      metadata: paymentIntent.metadata,
    };
  } catch (error) {
    throw mapStripeError(error);
  }
}

/**
 * Reembolsar pagamento no Stripe
 * @param {string} paymentIntentId - ID do PaymentIntent
 * @param {Object} options - Opções de reembolso
 * @param {number} options.amount - Valor a reembolsar (opcional, reembolsa total se não informado)
 * @param {string} options.reason - Motivo do reembolso
 * @returns {Promise<Object>} Refund criado
 */
async function refundPayment(paymentIntentId, options = {}) {
  try {
    // Buscar PaymentIntent para obter charge_id
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent.charges || paymentIntent.charges.data.length === 0) {
      throw new Error('REEMBOLSO_INDISPONIVEL: Pagamento não possui charge para reembolso');
    }

    const chargeId = paymentIntent.charges.data[0].id;

    // Criar reembolso
    const refund = await stripe.refunds.create({
      charge: chargeId,
      amount: options.amount ? Math.round(options.amount) : undefined, // Reembolso total se não informado
      reason: options.reason || 'requested_by_customer',
      metadata: {
        payment_intent_id: paymentIntentId,
        reason: options.reason || 'requested_by_customer',
        refunded_at: new Date().toISOString(),
      },
    });

    return {
      success: true,
      refund_id: refund.id,
      amount: refund.amount,
      currency: refund.currency,
      status: refund.status,
      reason: refund.reason,
      metadata: refund.metadata,
    };
  } catch (error) {
    throw mapStripeError(error);
  }
}

/**
 * Buscar pagamento no Stripe
 * @param {string} paymentIntentId - ID do PaymentIntent
 * @returns {Promise<Object>} PaymentIntent
 */
async function getPayment(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      success: true,
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      charges: paymentIntent.charges?.data || [],
      metadata: paymentIntent.metadata,
      created: paymentIntent.created,
    };
  } catch (error) {
    throw mapStripeError(error);
  }
}

/**
 * Criar método de pagamento (cartão)
 * @param {Object} cardData - Dados do cartão
 * @param {string} cardData.number - Número do cartão
 * @param {number} cardData.exp_month - Mês de expiração
 * @param {number} cardData.exp_year - Ano de expiração
 * @param {string} cardData.cvv - CVV
 * @param {string} cardData.holder_name - Nome do portador
 * @returns {Promise<Object>} PaymentMethod criado
 */
async function createPaymentMethod(cardData) {
  try {
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: cardData.number,
        exp_month: cardData.exp_month,
        exp_year: cardData.exp_year,
        cvc: cardData.cvv,
      },
      billing_details: {
        name: cardData.holder_name,
      },
    });

    return {
      success: true,
      payment_method_id: paymentMethod.id,
      type: paymentMethod.type,
      card: {
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        exp_month: paymentMethod.card.exp_month,
        exp_year: paymentMethod.card.exp_year,
      },
    };
  } catch (error) {
    throw mapStripeError(error);
  }
}

/**
 * Mapear erros do Stripe para erros padronizados
 * @param {Error} error - Erro do Stripe
 * @returns {Error} Erro mapeado
 */
function mapStripeError(error) {
  // Erros específicos do Stripe
  if (error.type === 'StripeCardError') {
    return new Error(`CARTAO_RECUSADO: ${error.message}`);
  }

  if (error.type === 'StripeRateLimitError') {
    return new Error(`RATE_LIMIT: Muitas requisições. Tente novamente em alguns instantes.`);
  }

  if (error.type === 'StripeInvalidRequestError') {
    return new Error(`REQUISICAO_INVALIDA: ${error.message}`);
  }

  if (error.type === 'StripeAPIError') {
    return new Error(`ERRO_API_STRIPE: ${error.message}`);
  }

  if (error.type === 'StripeConnectionError') {
    return new Error(`ERRO_CONEXAO_STRIPE: Não foi possível conectar ao Stripe.`);
  }

  if (error.type === 'StripeAuthenticationError') {
    return new Error(`ERRO_AUTENTICACAO_STRIPE: Chave de API inválida.`);
  }

  // Erro genérico
  return new Error(`ERRO_STRIPE: ${error.message}`);
}

module.exports = {
  createPayment,
  confirmPayment,
  refundPayment,
  getPayment,
  createPaymentMethod,
  mapStripeError,
};

