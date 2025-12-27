/**
 * 📅 Google Calendar Service
 * FASE 5.1: Integração com Google Calendar API
 * Sincronização bidirecional de reservas e disponibilidade
 */

const { db } = require("../config/database");
const { createLogger } = require("../utils/logger");
const circuitBreaker = require("../patterns/circuitBreaker");
const https = require('https');

const logger = createLogger({ service: 'googleCalendarService' });

// Configurações da API Google Calendar
const GOOGLE_CALENDAR_API_BASE_URL = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Circuit Breaker para a API Google Calendar
const googleCalendarCircuitBreaker = circuitBreaker.createCircuitBreaker(
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
            reject(new Error(`Google Calendar API returned status ${res.statusCode}: ${data}`));
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
    timeout: 10000,
    resetTimeout: 20000,
  }
);

/**
 * Obter token de acesso OAuth2
 */
async function getAccessToken(userId) {
  try {
    // Buscar refresh token do usuário
    const calendarAuth = await db("google_calendar_auth")
      .where("user_id", userId)
      .where("active", true)
      .first();

    if (!calendarAuth || !calendarAuth.refresh_token) {
      throw new Error("Google Calendar não autorizado para este usuário");
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      logger.warn('Credenciais Google OAuth não configuradas. Usando mock.');
      return { access_token: 'mock_token', expires_in: 3600 };
    }

    // Renovar token
    const tokenData = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: calendarAuth.refresh_token,
      grant_type: 'refresh_token',
    });

    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    const response = await googleCalendarCircuitBreaker.execute({
      ...options,
      body: tokenData.toString(),
    });

    return response;
  } catch (error) {
    logger.error('Erro ao obter access token', { userId, error: error.message });
    throw error;
  }
}

/**
 * Criar evento no Google Calendar
 */
async function createCalendarEvent(userId, bookingId, calendarId = 'primary') {
  try {
    const booking = await db("bookings")
      .where("id", bookingId)
      .first();

    if (!booking) {
      throw new Error("Reserva não encontrada");
    }

    const property = await db("properties")
      .where("id", booking.property_id)
      .first();

    const accessToken = await getAccessToken(userId);
    const token = accessToken.access_token || accessToken;

    const eventData = {
      summary: `Reserva #${booking.booking_number || bookingId} - ${property?.title || 'Propriedade'}`,
      description: `Reserva confirmada\n\nHóspede: ${booking.guest_name || 'N/A'}\nCheck-in: ${new Date(booking.check_in_date).toLocaleDateString('pt-BR')}\nCheck-out: ${new Date(booking.check_out_date).toLocaleDateString('pt-BR')}\nValor: R$ ${parseFloat(booking.total_amount || 0).toFixed(2)}`,
      start: {
        dateTime: new Date(booking.check_in_date).toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: new Date(booking.check_out_date).toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      location: property?.address || '',
      colorId: '10', // Verde
    };

    const url = new URL(`${GOOGLE_CALENDAR_API_BASE_URL}/calendars/${calendarId}/events`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    };

    const event = await googleCalendarCircuitBreaker.execute(options);

    // Salvar referência do evento
    await db("google_calendar_events").insert({
      user_id: userId,
      booking_id: bookingId,
      calendar_id: calendarId,
      event_id: event.id,
      event_link: event.htmlLink,
      synced_at: new Date(),
    });

    logger.info('Evento criado no Google Calendar', { userId, bookingId, eventId: event.id });

    return event;
  } catch (error) {
    logger.error('Erro ao criar evento no Google Calendar', { userId, bookingId, error: error.message });
    throw error;
  }
}

/**
 * Sincronizar disponibilidade do Google Calendar
 */
async function syncAvailabilityFromCalendar(userId, calendarId = 'primary') {
  try {
    const accessToken = await getAccessToken(userId);
    const token = accessToken.access_token || accessToken;

    const now = new Date();
    const future = new Date();
    future.setMonth(future.getMonth() + 6); // Próximos 6 meses

    const url = new URL(`${GOOGLE_CALENDAR_API_BASE_URL}/calendars/${calendarId}/events`);
    url.searchParams.append('timeMin', now.toISOString());
    url.searchParams.append('timeMax', future.toISOString());
    url.searchParams.append('singleEvents', 'true');
    url.searchParams.append('orderBy', 'startTime');

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    };

    const response = await googleCalendarCircuitBreaker.execute(options);
    const events = response.items || [];

    // Buscar propriedades do host
    const properties = await db("properties")
      .where("owner_id", userId)
      .select("id");

    const blockedDates = [];

    for (const event of events) {
      const startDate = new Date(event.start.dateTime || event.start.date);
      const endDate = new Date(event.end.dateTime || event.end.date);

      // Bloquear datas em todas as propriedades do host
      for (const property of properties) {
        // Criar bloqueios de disponibilidade
        const existing = await db("availability")
          .where("property_id", property.id)
          .where("date", ">=", startDate.toISOString().split('T')[0])
          .where("date", "<", endDate.toISOString().split('T')[0])
          .first();

        if (!existing) {
          await db("availability").insert({
            property_id: property.id,
            date: startDate.toISOString().split('T')[0],
            available: false,
            reason: `Google Calendar: ${event.summary || 'Evento'}`,
            source: 'google_calendar',
            created_at: new Date(),
          });
          blockedDates.push({
            property_id: property.id,
            date: startDate.toISOString().split('T')[0],
          });
        }
      }
    }

    logger.info('Disponibilidade sincronizada do Google Calendar', { userId, eventsCount: events.length, blockedDates: blockedDates.length });

    return {
      events_synced: events.length,
      dates_blocked: blockedDates.length,
      blocked_dates: blockedDates,
    };
  } catch (error) {
    logger.error('Erro ao sincronizar disponibilidade', { userId, error: error.message });
    throw error;
  }
}

/**
 * Salvar autorização OAuth2
 */
async function saveCalendarAuth(userId, authData) {
  try {
    const { access_token, refresh_token, expires_in } = authData;

    // Verificar se já existe
    const existing = await db("google_calendar_auth")
      .where("user_id", userId)
      .first();

    const authRecord = {
      user_id: userId,
      access_token,
      refresh_token,
      expires_at: new Date(Date.now() + (expires_in * 1000)),
      active: true,
      updated_at: new Date(),
    };

    if (existing) {
      await db("google_calendar_auth")
        .where("user_id", userId)
        .update(authRecord);
    } else {
      authRecord.created_at = new Date();
      await db("google_calendar_auth").insert(authRecord);
    }

    logger.info('Autorização Google Calendar salva', { userId });
    return authRecord;
  } catch (error) {
    logger.error('Erro ao salvar autorização', { userId, error: error.message });
    throw error;
  }
}

/**
 * Verificar se usuário tem Google Calendar conectado
 */
async function isCalendarConnected(userId) {
  try {
    const auth = await db("google_calendar_auth")
      .where("user_id", userId)
      .where("active", true)
      .first();

    return !!auth;
  } catch (error) {
    logger.error('Erro ao verificar conexão', { userId, error: error.message });
    return false;
  }
}

module.exports = {
  createCalendarEvent,
  syncAvailabilityFromCalendar,
  saveCalendarAuth,
  isCalendarConnected,
  getAccessToken,
};

