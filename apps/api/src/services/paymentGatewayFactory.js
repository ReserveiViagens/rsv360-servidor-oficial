/**
 * 🏭 Payment Gateway Factory
 * FASE B3.3: Factory Pattern para múltiplos gateways de pagamento
 * Abstrai diferenças entre gateways e fornece interface comum
 */

const stripeService = require('./stripeService');
const mercadoPagoService = require('./mercadoPagoService');

// Gateways suportados
const GATEWAYS = {
  STRIPE: 'stripe',
  MERCADO_PAGO: 'mercado_pago',
};

/**
 * Factory para criar instância de gateway
 * @param {string} gatewayName - Nome do gateway ('stripe' ou 'mercado_pago')
 * @returns {Object} Instância do gateway com métodos padronizados
 */
function createGateway(gatewayName) {
  const normalizedName = gatewayName?.toLowerCase().trim();

  switch (normalizedName) {
    case GATEWAYS.STRIPE:
      return createStripeGateway();
    case GATEWAYS.MERCADO_PAGO:
      return createMercadoPagoGateway();
    default:
      throw new Error(`GATEWAY_NAO_SUPORTADO: Gateway '${gatewayName}' não é suportado. Gateways disponíveis: ${Object.values(GATEWAYS).join(', ')}`);
  }
}

/**
 * Criar gateway Stripe com interface padronizada
 * @returns {Object} Gateway Stripe
 */
function createStripeGateway() {
  return {
    name: GATEWAYS.STRIPE,
    createPayment: async (paymentData) => {
      // Converter valor de reais para centavos (Stripe usa centavos)
      const amountInCents = Math.round(paymentData.amount * 100);

      // Criar método de pagamento se dados do cartão fornecidos
      let payment_method_id = paymentData.payment_method_id;
      if (paymentData.card_data && !payment_method_id) {
        const paymentMethod = await stripeService.createPaymentMethod(paymentData.card_data);
        payment_method_id = paymentMethod.payment_method_id;
      }

      const result = await stripeService.createPayment({
        amount: amountInCents,
        currency: paymentData.currency || 'brl',
        payment_method_id,
        customer_id: paymentData.customer_id,
        description: paymentData.description,
        metadata: paymentData.metadata,
      });

      return {
        gateway: GATEWAYS.STRIPE,
        transaction_id: result.payment_intent_id,
        status: result.status,
        amount: result.amount / 100, // Converter de centavos para reais
        currency: result.currency.toUpperCase(),
        client_secret: result.client_secret, // Para confirmação no frontend
        metadata: result.metadata,
      };
    },
    confirmPayment: async (transactionId) => {
      const result = await stripeService.confirmPayment(transactionId);
      return {
        gateway: GATEWAYS.STRIPE,
        transaction_id: result.payment_intent_id,
        status: result.status,
        amount: result.amount / 100, // Converter de centavos para reais
        currency: result.currency.toUpperCase(),
        metadata: result.metadata,
      };
    },
    refundPayment: async (transactionId, options = {}) => {
      const result = await stripeService.refundPayment(transactionId, {
        amount: options.amount ? Math.round(options.amount * 100) : undefined, // Converter para centavos
        reason: options.reason,
      });
      return {
        gateway: GATEWAYS.STRIPE,
        refund_id: result.refund_id,
        transaction_id: transactionId,
        amount: result.amount / 100, // Converter de centavos para reais
        currency: result.currency.toUpperCase(),
        status: result.status,
      };
    },
    getPayment: async (transactionId) => {
      const result = await stripeService.getPayment(transactionId);
      return {
        gateway: GATEWAYS.STRIPE,
        transaction_id: result.payment_intent_id,
        status: result.status,
        amount: result.amount / 100, // Converter de centavos para reais
        currency: result.currency.toUpperCase(),
        metadata: result.metadata,
      };
    },
  };
}

/**
 * Criar gateway Mercado Pago com interface padronizada
 * @returns {Object} Gateway Mercado Pago
 */
function createMercadoPagoGateway() {
  return {
    name: GATEWAYS.MERCADO_PAGO,
    createPayment: async (paymentData) => {
      const result = await mercadoPagoService.createPayment({
        amount: paymentData.amount,
        payment_method_id: paymentData.payment_method_id,
        description: paymentData.description,
        payer_email: paymentData.payer_email,
        card_data: paymentData.card_data,
        metadata: paymentData.metadata,
      });

      return {
        gateway: GATEWAYS.MERCADO_PAGO,
        transaction_id: result.payment_id,
        status: result.status,
        amount: result.amount,
        currency: result.currency,
        status_detail: result.status_detail,
        metadata: result.metadata,
      };
    },
    confirmPayment: async (transactionId) => {
      const result = await mercadoPagoService.confirmPayment(transactionId);
      return {
        gateway: GATEWAYS.MERCADO_PAGO,
        transaction_id: result.payment_id,
        status: result.status,
        amount: result.amount,
        currency: result.currency,
        status_detail: result.status_detail,
        metadata: result.metadata,
      };
    },
    refundPayment: async (transactionId, options = {}) => {
      const result = await mercadoPagoService.refundPayment(transactionId, {
        amount: options.amount,
        reason: options.reason,
      });
      return {
        gateway: GATEWAYS.MERCADO_PAGO,
        refund_id: result.refund_id,
        transaction_id: transactionId,
        amount: result.amount,
        currency: result.currency,
        status: result.status,
      };
    },
    getPayment: async (transactionId) => {
      const result = await mercadoPagoService.getPayment(transactionId);
      return {
        gateway: GATEWAYS.MERCADO_PAGO,
        transaction_id: result.payment_id,
        status: result.status,
        amount: result.amount,
        currency: result.currency,
        status_detail: result.status_detail,
        metadata: result.metadata,
      };
    },
  };
}

/**
 * Validar se gateway é suportado
 * @param {string} gatewayName - Nome do gateway
 * @returns {boolean} true se suportado
 */
function isGatewaySupported(gatewayName) {
  const normalizedName = gatewayName?.toLowerCase().trim();
  return Object.values(GATEWAYS).includes(normalizedName);
}

/**
 * Listar gateways disponíveis
 * @returns {Array<string>} Lista de gateways
 */
function getAvailableGateways() {
  return Object.values(GATEWAYS);
}

module.exports = {
  createGateway,
  isGatewaySupported,
  getAvailableGateways,
  GATEWAYS,
};

