/**
 * 🔐 Webhook Validation Service
 * FASE A3: Validação de assinaturas de webhooks
 * Suporta Stripe, Mercado Pago e outros gateways
 */

const crypto = require('crypto');

/**
 * Validar assinatura de webhook do Stripe
 * @param {string|Buffer} payload - Payload do webhook (raw body)
 * @param {string} signature - Header 'stripe-signature'
 * @param {string} secret - Stripe webhook secret
 * @returns {Object} Evento validado do Stripe
 * @throws {Error} Se a assinatura for inválida
 */
function validateStripeWebhook(payload, signature, secret) {
  if (!signature) {
    throw new Error('Missing stripe-signature header');
  }

  if (!secret) {
    throw new Error('Stripe webhook secret not configured');
  }

  try {
    // Stripe usa formato: timestamp,signature1,signature2...
    const elements = signature.split(',');
    const timestamp = elements.find((el) => el.startsWith('t='))?.split('=')[1];
    const signatures = elements.filter((el) => el.startsWith('v1=')).map((el) => el.split('=')[1]);

    if (!timestamp || signatures.length === 0) {
      throw new Error('Invalid signature format');
    }

    // Criar assinatura esperada
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    // Verificar se alguma das assinaturas corresponde
    const isValid = signatures.some((sig) => {
      if (sig.length !== expectedSignature.length) {
        return false;
      }
      try {
        return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSignature));
      } catch {
        return false;
      }
    });

    if (!isValid) {
      throw new Error('Invalid signature');
    }

    // Verificar timestamp (não aceitar eventos muito antigos - 5 minutos)
    const currentTime = Math.floor(Date.now() / 1000);
    const eventTime = parseInt(timestamp, 10);
    const timeDifference = Math.abs(currentTime - eventTime);

    if (timeDifference > 300) {
      throw new Error('Timestamp too old');
    }

    // Parse do payload JSON
    const event = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString());

    return event;
  } catch (error) {
    if (error.message.includes('Invalid') || error.message.includes('Missing')) {
      throw error;
    }
    throw new Error(`Stripe webhook validation failed: ${error.message}`);
  }
}

/**
 * Validar assinatura de webhook do Mercado Pago
 * @param {string|Buffer} payload - Payload do webhook (raw body)
 * @param {Object} headers - Headers da requisição
 * @param {string} secret - Mercado Pago webhook secret
 * @returns {Object} Evento validado do Mercado Pago
 * @throws {Error} Se a assinatura for inválida
 */
function validateMercadoPagoWebhook(payload, headers, secret) {
  if (!secret) {
    throw new Error('Mercado Pago webhook secret not configured');
  }

  try {
    // Mercado Pago usa header 'x-signature' ou 'x-request-id'
    const signature = headers['x-signature'] || headers['x-request-id'];

    if (!signature) {
      throw new Error('Missing x-signature or x-request-id header');
    }

    // Mercado Pago usa HMAC-SHA256 com formato: sha256=hash
    const payloadString = typeof payload === 'string' ? payload : payload.toString();
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString, 'utf8')
      .digest('hex');

    // Verificar assinatura
    const receivedSignature = signature.startsWith('sha256=') ? signature.split('=')[1] : signature;

    if (receivedSignature.length !== expectedSignature.length) {
      throw new Error('Invalid signature');
    }

    try {
      if (!crypto.timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expectedSignature))) {
        throw new Error('Invalid signature');
      }
    } catch (error) {
      if (error.message === 'Invalid signature') {
        throw error;
      }
      throw new Error('Invalid signature');
    }

    // Parse do payload JSON
    const event = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString());

    return event;
  } catch (error) {
    if (error.message.includes('Invalid') || error.message.includes('Missing')) {
      throw error;
    }
    throw new Error(`Mercado Pago webhook validation failed: ${error.message}`);
  }
}

/**
 * Validação genérica de webhook
 * @param {string} gateway - Nome do gateway ('stripe', 'mercado_pago', etc)
 * @param {string|Buffer} payload - Payload do webhook
 * @param {Object} headers - Headers da requisição
 * @param {string} secret - Secret do webhook
 * @returns {Object} Evento validado
 * @throws {Error} Se a validação falhar
 */
function validateWebhookSignature(gateway, payload, headers, secret) {
  switch (gateway.toLowerCase()) {
    case 'stripe':
      const stripeSignature = headers['stripe-signature'];
      return validateStripeWebhook(payload, stripeSignature, secret);

    case 'mercado_pago':
    case 'mercadopago':
      return validateMercadoPagoWebhook(payload, headers, secret);

    default:
      throw new Error(`Unsupported gateway: ${gateway}`);
  }
}

/**
 * Obter secret do webhook baseado no gateway
 * @param {string} gateway - Nome do gateway
 * @returns {string} Secret do webhook
 */
function getWebhookSecret(gateway) {
  const secrets = {
    stripe: process.env.STRIPE_WEBHOOK_SECRET,
    mercado_pago: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
    mercadopago: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
  };

  return secrets[gateway.toLowerCase()];
}

module.exports = {
  validateStripeWebhook,
  validateMercadoPagoWebhook,
  validateWebhookSignature,
  getWebhookSecret,
};

