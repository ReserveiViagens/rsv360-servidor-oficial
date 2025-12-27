/**
 * 💳 Klarna Service
 * FASE 5.3: Integração com Klarna (Reserve Now Pay Later)
 * Suporta pagamento parcelado e pagamento posterior
 */

const { db } = require("../config/database");
const { createLogger } = require("../utils/logger");
const circuitBreaker = require("../patterns/circuitBreaker");
const https = require('https');

const logger = createLogger({ service: 'klarnaService' });

// Configurações da API Klarna
const KLARNA_API_BASE_URL = process.env.KLARNA_API_BASE_URL || 'https://api.klarna.com';
const KLARNA_USERNAME = process.env.KLARNA_USERNAME;
const KLARNA_PASSWORD = process.env.KLARNA_PASSWORD;

// Circuit Breaker para a API Klarna
const klarnaCircuitBreaker = circuitBreaker.createCircuitBreaker(
  async (options) => {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve(data);
            }
          } else {
            reject(new Error(`Klarna API returned status ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  },
  {
    failureThreshold: 3,
    timeout: 15000,
    resetTimeout: 30000,
  }
);

/**
 * Verificar elegibilidade para Klarna
 */
async function checkEligibility(bookingId, amount) {
  try {
    const booking = await db("bookings")
      .where("id", bookingId)
      .first();

    if (!booking) {
      throw new Error("Reserva não encontrada");
    }

    // Critérios de elegibilidade
    const minAmount = 100; // R$ 100 mínimo
    const maxAmount = 10000; // R$ 10.000 máximo
    const minDaysUntilCheckIn = 14; // Mínimo 14 dias até check-in

    if (amount < minAmount) {
      return {
        eligible: false,
        reason: `Valor mínimo de R$ ${minAmount} não atingido`,
      };
    }

    if (amount > maxAmount) {
      return {
        eligible: false,
        reason: `Valor máximo de R$ ${maxAmount} excedido`,
      };
    }

    const checkInDate = new Date(booking.check_in_date);
    const today = new Date();
    const daysUntilCheckIn = Math.ceil((checkInDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilCheckIn < minDaysUntilCheckIn) {
      return {
        eligible: false,
        reason: `Check-in deve ser pelo menos ${minDaysUntilCheckIn} dias no futuro`,
      };
    }

    // Verificar política de cancelamento (deve ser flexível)
    const property = await db("properties")
      .where("id", booking.property_id)
      .first();

    const hasFlexibleCancellation = property?.cancellation_policy === 'flexible' || 
                                   property?.cancellation_policy === 'moderate';

    if (!hasFlexibleCancellation) {
      return {
        eligible: false,
        reason: 'Propriedade deve ter política de cancelamento flexível',
      };
    }

    return {
      eligible: true,
      minAmount,
      maxAmount,
      minDaysUntilCheckIn,
    };
  } catch (error) {
    logger.error('Erro ao verificar elegibilidade Klarna', { bookingId, error: error.message });
    throw error;
  }
}

/**
 * Criar sessão Klarna (Reserve Now Pay Later)
 */
async function createPayLaterSession(bookingId, customerData) {
  try {
    const booking = await db("bookings")
      .where("id", bookingId)
      .first();

    if (!booking) {
      throw new Error("Reserva não encontrada");
    }

    // Verificar elegibilidade
    const eligibility = await checkEligibility(bookingId, parseFloat(booking.total_amount || 0));
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason);
    }

    if (!KLARNA_USERNAME || !KLARNA_PASSWORD) {
      logger.warn('Credenciais Klarna não configuradas. Usando mock.');
      // Mock para desenvolvimento
      const mockSessionId = `mock_klarna_${Date.now()}`;
      await db("klarna_sessions").insert({
        booking_id: bookingId,
        session_id: mockSessionId,
        status: 'pending',
        amount: parseFloat(booking.total_amount || 0),
        currency: 'BRL',
        created_at: new Date(),
      });
      return {
        session_id: mockSessionId,
        redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/klarna/checkout?session=${mockSessionId}`,
        expires_at: new Date(Date.now() + 3600000), // 1 hora
      };
    }

    // Criar sessão na API Klarna
    const orderData = {
      purchase_country: 'BR',
      purchase_currency: 'BRL',
      locale: 'pt-BR',
      order_amount: Math.round(parseFloat(booking.total_amount || 0) * 100), // Em centavos
      order_lines: [
        {
          name: `Reserva #${booking.booking_number || bookingId}`,
          quantity: 1,
          unit_price: Math.round(parseFloat(booking.total_amount || 0) * 100),
          total_amount: Math.round(parseFloat(booking.total_amount || 0) * 100),
        },
      ],
      billing_address: {
        given_name: customerData.first_name || 'Cliente',
        family_name: customerData.last_name || '',
        email: customerData.email || booking.guest_email,
        phone: customerData.phone || '',
        street_address: customerData.address || '',
        city: customerData.city || '',
        postal_code: customerData.postal_code || '',
        country: 'BR',
      },
    };

    const auth = Buffer.from(`${KLARNA_USERNAME}:${KLARNA_PASSWORD}`).toString('base64');
    const url = new URL(`${KLARNA_API_BASE_URL}/payments/v1/sessions`);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    };

    const response = await klarnaCircuitBreaker.execute(options);

    // Salvar sessão no banco
    await db("klarna_sessions").insert({
      booking_id: bookingId,
      session_id: response.session_id,
      status: 'pending',
      amount: parseFloat(booking.total_amount || 0),
      currency: 'BRL',
      client_token: response.client_token,
      created_at: new Date(),
    });

    logger.info('Sessão Klarna criada', { bookingId, sessionId: response.session_id });

    return {
      session_id: response.session_id,
      client_token: response.client_token,
      redirect_url: response.redirect_url,
      expires_at: new Date(response.expires_at),
    };
  } catch (error) {
    logger.error('Erro ao criar sessão Klarna', { bookingId, error: error.message });
    throw error;
  }
}

/**
 * Confirmar pagamento Klarna
 */
async function confirmPayment(sessionId, authorizationToken) {
  try {
    const session = await db("klarna_sessions")
      .where("session_id", sessionId)
      .first();

    if (!session) {
      throw new Error("Sessão Klarna não encontrada");
    }

    if (session.status !== 'pending') {
      throw new Error(`Sessão já processada com status: ${session.status}`);
    }

    if (!KLARNA_USERNAME || !KLARNA_PASSWORD) {
      logger.warn('Credenciais Klarna não configuradas. Usando mock.');
      // Mock
      await db("klarna_sessions")
        .where("session_id", sessionId)
        .update({
          status: 'authorized',
          authorization_token: authorizationToken,
          authorized_at: new Date(),
        });
      return { status: 'authorized', order_id: `mock_order_${Date.now()}` };
    }

    // Confirmar pagamento na API Klarna
    const auth = Buffer.from(`${KLARNA_USERNAME}:${KLARNA_PASSWORD}`).toString('base64');
    const url = new URL(`${KLARNA_API_BASE_URL}/payments/v1/authorizations/${authorizationToken}/order`);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_amount: Math.round(session.amount * 100),
        purchase_country: 'BR',
        purchase_currency: 'BRL',
      }),
    };

    const response = await klarnaCircuitBreaker.execute(options);

    // Atualizar sessão
    await db("klarna_sessions")
      .where("session_id", sessionId)
      .update({
        status: 'authorized',
        authorization_token: authorizationToken,
        order_id: response.order_id,
        authorized_at: new Date(),
      });

    // Atualizar reserva
    await db("bookings")
      .where("id", session.booking_id)
      .update({
        payment_status: 'paid',
        payment_method: 'klarna',
        updated_at: new Date(),
      });

    logger.info('Pagamento Klarna confirmado', { sessionId, orderId: response.order_id });

    return {
      status: 'authorized',
      order_id: response.order_id,
      booking_id: session.booking_id,
    };
  } catch (error) {
    logger.error('Erro ao confirmar pagamento Klarna', { sessionId, error: error.message });
    throw error;
  }
}

/**
 * Obter status de uma sessão Klarna
 */
async function getSessionStatus(sessionId) {
  try {
    const session = await db("klarna_sessions")
      .where("session_id", sessionId)
      .first();

    if (!session) {
      throw new Error("Sessão não encontrada");
    }

    return {
      session_id: session.session_id,
      booking_id: session.booking_id,
      status: session.status,
      amount: session.amount,
      currency: session.currency,
      created_at: session.created_at,
      authorized_at: session.authorized_at,
      order_id: session.order_id,
    };
  } catch (error) {
    logger.error('Erro ao obter status da sessão', { sessionId, error: error.message });
    throw error;
  }
}

/**
 * Processar webhook Klarna
 */
async function processWebhook(webhookData) {
  try {
    const { event_type, order_id, session_id } = webhookData;

    logger.info('Processando webhook Klarna', { event_type, order_id, session_id });

    switch (event_type) {
      case 'order.created':
      case 'order.updated':
        // Atualizar status da sessão
        if (session_id) {
          await db("klarna_sessions")
            .where("session_id", session_id)
            .update({
              status: 'authorized',
              order_id: order_id,
              authorized_at: new Date(),
            });
        }
        break;

      case 'order.cancelled':
        if (session_id) {
          await db("klarna_sessions")
            .where("session_id", session_id)
            .update({
              status: 'cancelled',
              cancelled_at: new Date(),
            });
        }
        break;

      default:
        logger.warn('Tipo de webhook não tratado', { event_type });
    }

    return { success: true };
  } catch (error) {
    logger.error('Erro ao processar webhook Klarna', { error: error.message });
    throw error;
  }
}

module.exports = {
  checkEligibility,
  createPayLaterSession,
  confirmPayment,
  getSessionStatus,
  processWebhook,
};

