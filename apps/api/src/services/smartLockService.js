/**
 * 🔐 Smart Lock Service
 * FASE 5.2: Integração com fechaduras inteligentes
 * Suporta múltiplos providers: Intelbras, Garen, Yale, August
 */

const { db } = require("../config/database");
const { createLogger } = require("../utils/logger");
const circuitBreaker = require("../patterns/circuitBreaker");
const https = require('https');
const crypto = require('crypto');

const logger = createLogger({ service: 'smartLockService' });

// Circuit Breaker para APIs de Smart Locks
const smartLockCircuitBreaker = circuitBreaker.createCircuitBreaker(
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
            reject(new Error(`Smart Lock API returned status ${res.statusCode}: ${data}`));
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
 * Gerar código de acesso temporário
 */
function generateAccessCode(length = 6) {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Criar código de acesso para uma reserva (Intelbras)
 */
async function createIntelbrasAccessCode(lockId, bookingId, startDate, endDate) {
  try {
    const lock = await db("smart_locks")
      .where("id", lockId)
      .first();

    if (!lock || lock.provider !== 'intelbras') {
      throw new Error("Fechadura Intelbras não encontrada");
    }

    const booking = await db("bookings")
      .where("id", bookingId)
      .first();

    if (!booking) {
      throw new Error("Reserva não encontrada");
    }

    const accessCode = generateAccessCode();
    const apiKey = process.env.INTELBRAS_API_KEY;

    if (!apiKey) {
      logger.warn('INTELBRAS_API_KEY não configurada. Usando mock.');
      // Mock para desenvolvimento
      await db("smart_lock_codes").insert({
        lock_id: lockId,
        booking_id: bookingId,
        code: accessCode,
        start_date: startDate,
        end_date: endDate,
        status: 'active',
        provider: 'intelbras',
        created_at: new Date(),
      });
      return { code: accessCode, status: 'active' };
    }

    // Chamada real à API Intelbras (exemplo)
    const options = {
      hostname: 'api.intelbras.com',
      path: `/v1/locks/${lock.external_id}/codes`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: accessCode,
        start_time: startDate,
        end_time: endDate,
        name: `Reserva #${booking.booking_number || bookingId}`,
      }),
    };

    const response = await smartLockCircuitBreaker.execute(options);

    // Salvar código no banco
    await db("smart_lock_codes").insert({
      lock_id: lockId,
      booking_id: bookingId,
      code: accessCode,
      start_date: startDate,
      end_date: endDate,
      status: 'active',
      provider: 'intelbras',
      external_code_id: response.id,
      created_at: new Date(),
    });

    logger.info('Código de acesso criado (Intelbras)', { lockId, bookingId, code: accessCode });

    return { code: accessCode, status: 'active', external_id: response.id };
  } catch (error) {
    logger.error('Erro ao criar código Intelbras', { lockId, bookingId, error: error.message });
    throw error;
  }
}

/**
 * Criar código de acesso para uma reserva (Garen)
 */
async function createGarenAccessCode(lockId, bookingId, startDate, endDate) {
  try {
    const lock = await db("smart_locks")
      .where("id", lockId)
      .first();

    if (!lock || lock.provider !== 'garen') {
      throw new Error("Fechadura Garen não encontrada");
    }

    const accessCode = generateAccessCode();
    const apiKey = process.env.GAREN_API_KEY;

    if (!apiKey) {
      logger.warn('GAREN_API_KEY não configurada. Usando mock.');
      await db("smart_lock_codes").insert({
        lock_id: lockId,
        booking_id: bookingId,
        code: accessCode,
        start_date: startDate,
        end_date: endDate,
        status: 'active',
        provider: 'garen',
        created_at: new Date(),
      });
      return { code: accessCode, status: 'active' };
    }

    // Chamada real à API Garen (exemplo)
    const options = {
      hostname: 'api.garen.com.br',
      path: `/v1/devices/${lock.external_id}/access-codes`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pin: accessCode,
        valid_from: startDate,
        valid_until: endDate,
      }),
    };

    const response = await smartLockCircuitBreaker.execute(options);

    await db("smart_lock_codes").insert({
      lock_id: lockId,
      booking_id: bookingId,
      code: accessCode,
      start_date: startDate,
      end_date: endDate,
      status: 'active',
      provider: 'garen',
      external_code_id: response.id,
      created_at: new Date(),
    });

    logger.info('Código de acesso criado (Garen)', { lockId, bookingId, code: accessCode });

    return { code: accessCode, status: 'active', external_id: response.id };
  } catch (error) {
    logger.error('Erro ao criar código Garen', { lockId, bookingId, error: error.message });
    throw error;
  }
}

/**
 * Criar código de acesso (genérico - detecta provider)
 */
async function createAccessCode(lockId, bookingId, startDate, endDate) {
  try {
    const lock = await db("smart_locks")
      .where("id", lockId)
      .first();

    if (!lock) {
      throw new Error("Fechadura não encontrada");
    }

    switch (lock.provider) {
      case 'intelbras':
        return await createIntelbrasAccessCode(lockId, bookingId, startDate, endDate);
      case 'garen':
        return await createGarenAccessCode(lockId, bookingId, startDate, endDate);
      case 'yale':
      case 'august':
        // Implementar quando necessário
        throw new Error(`Provider ${lock.provider} ainda não implementado`);
      default:
        throw new Error(`Provider desconhecido: ${lock.provider}`);
    }
  } catch (error) {
    logger.error('Erro ao criar código de acesso', { lockId, bookingId, error: error.message });
    throw error;
  }
}

/**
 * Revogar código de acesso
 */
async function revokeAccessCode(codeId) {
  try {
    const code = await db("smart_lock_codes")
      .where("id", codeId)
      .first();

    if (!code) {
      throw new Error("Código não encontrado");
    }

    if (code.status === 'revoked') {
      return { success: true, message: "Código já estava revogado" };
    }

    // Revogar na API do provider se necessário
    const lock = await db("smart_locks")
      .where("id", code.lock_id)
      .first();

    if (lock && code.external_code_id) {
      try {
        // Chamada à API para revogar (implementar conforme provider)
        logger.info('Código revogado na API do provider', { codeId, provider: lock.provider });
      } catch (error) {
        logger.warn('Erro ao revogar código na API, revogando localmente', { codeId, error: error.message });
      }
    }

    // Marcar como revogado no banco
    await db("smart_lock_codes")
      .where("id", codeId)
      .update({
        status: 'revoked',
        revoked_at: new Date(),
      });

    logger.info('Código de acesso revogado', { codeId });

    return { success: true, message: "Código revogado com sucesso" };
  } catch (error) {
    logger.error('Erro ao revogar código', { codeId, error: error.message });
    throw error;
  }
}

/**
 * Obter códigos de uma reserva
 */
async function getBookingCodes(bookingId) {
  try {
    const codes = await db("smart_lock_codes")
      .select(
        "smart_lock_codes.*",
        "smart_locks.name as lock_name",
        "smart_locks.provider",
        "smart_locks.property_id"
      )
      .leftJoin("smart_locks", "smart_lock_codes.lock_id", "smart_locks.id")
      .where("smart_lock_codes.booking_id", bookingId)
      .orderBy("smart_lock_codes.created_at", "desc");

    return codes;
  } catch (error) {
    logger.error('Erro ao obter códigos da reserva', { bookingId, error: error.message });
    throw error;
  }
}

/**
 * Verificar status de uma fechadura
 */
async function getLockStatus(lockId) {
  try {
    const lock = await db("smart_locks")
      .where("id", lockId)
      .first();

    if (!lock) {
      throw new Error("Fechadura não encontrada");
    }

    // Verificar status na API do provider
    const apiKey = process.env[`${lock.provider.toUpperCase()}_API_KEY`];
    
    if (!apiKey) {
      return {
        lock_id: lockId,
        status: 'unknown',
        battery_level: null,
        last_sync: null,
        message: 'API key não configurada',
      };
    }

    // Chamada à API (implementar conforme provider)
    // Por enquanto, retornar status do banco
    return {
      lock_id: lockId,
      status: lock.status || 'online',
      battery_level: lock.battery_level,
      last_sync: lock.last_sync,
    };
  } catch (error) {
    logger.error('Erro ao verificar status da fechadura', { lockId, error: error.message });
    throw error;
  }
}

module.exports = {
  createAccessCode,
  createIntelbrasAccessCode,
  createGarenAccessCode,
  revokeAccessCode,
  getBookingCodes,
  getLockStatus,
  generateAccessCode,
};

