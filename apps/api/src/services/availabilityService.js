/**
 * 🏠 Availability Service
 * FASE 2.1: Verificação de disponibilidade com Redis
 * Sistema de verificação de disponibilidade de propriedades com cache
 */

const { db } = require("../config/database");
const Redis = require("ioredis");
const { checkRedisConnection, isRedisAvailable } = require("../utils/redisHealth");
const { validateDateFormat, validateDateLogic } = require("../utils/dateValidation");

// Configurar cliente Redis
const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  db: process.env.REDIS_DB || 0,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

// Tratamento de erros do Redis
redisClient.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
});

redisClient.on("connect", () => {
  console.log("✅ Redis connected");
});

/**
 * Verifica se Redis está disponível e funcional
 * @returns {Promise<boolean>}
 */
async function isRedisHealthy() {
  try {
    const health = await checkRedisConnection(redisClient);
    return health.connected;
  } catch (error) {
    return false;
  }
}

/**
 * Verifica disponibilidade de uma propriedade para um período
 * @param {number} propertyId - ID da propriedade
 * @param {string} checkIn - Data de check-in (YYYY-MM-DD)
 * @param {string} checkOut - Data de check-out (YYYY-MM-DD)
 * @returns {Promise<{available: boolean, conflictingBookings: number}>}
 */
async function checkAvailability(propertyId, checkIn, checkOut) {
  // FASE B2.1 e B2.2: Validar formato e lógica de datas
  const dateFormatValidation = validateDateFormat(checkIn);
  if (!dateFormatValidation.valid) {
    throw new Error(`Check-in inválido: ${dateFormatValidation.error}`);
  }

  const checkOutFormatValidation = validateDateFormat(checkOut);
  if (!checkOutFormatValidation.valid) {
    throw new Error(`Check-out inválido: ${checkOutFormatValidation.error}`);
  }

  const dateLogicValidation = validateDateLogic(checkIn, checkOut, {
    allowPast: false, // Não permitir datas no passado
    minStayDays: 1, // Mínimo 1 dia
  });

  if (!dateLogicValidation.valid) {
    throw new Error(dateLogicValidation.error);
  }

  const cacheKey = `availability:${propertyId}:${checkIn}:${checkOut}`;

  // Verificar se Redis está disponível antes de tentar usar
  const redisHealthy = await isRedisHealthy();

  if (redisHealthy) {
    try {
      // Verificar cache Redis
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn("⚠️  Redis cache miss, consultando banco:", error.message);
    }
  } else {
    console.warn("⚠️  Redis indisponível, usando fallback para banco de dados");
  }

  try {
    // Verificar no banco de dados (fallback ou cache miss)
    // Buscar reservas que conflitam com o período
    const bookings = await db("bookings")
      .where("property_id", propertyId)
      .whereIn("status", ["pending", "confirmed", "in_progress"])
      .where(function () {
        this.where(function () {
          // Check-in dentro do período solicitado
          this.whereBetween("check_in", [checkIn, checkOut])
            // Check-out dentro do período solicitado
            .orWhereBetween("check_out", [checkIn, checkOut])
            // Período solicitado está completamente dentro de uma reserva existente
            .orWhere(function () {
              this.where("check_in", "<=", checkIn).where("check_out", ">=", checkOut);
            });
        });
      });

    const isAvailable = bookings.length === 0;

    const result = {
      available: isAvailable,
      conflictingBookings: bookings.length,
      conflictingBookingIds: bookings.map((b) => b.id),
    };

    // Tentar cache apenas se Redis estiver disponível
    if (redisHealthy) {
      try {
        await redisClient.setex(cacheKey, 300, JSON.stringify(result));
      } catch (error) {
        console.warn("⚠️  Erro ao salvar no cache:", error.message);
      }
    }

    return result;
  } catch (error) {
    console.error("❌ Erro ao verificar disponibilidade:", error);
    throw error;
  }
}

/**
 * Bloqueia período temporariamente para reserva (evita race conditions)
 * @param {number} propertyId - ID da propriedade
 * @param {string} checkIn - Data de check-in
 * @param {string} checkOut - Data de check-out
 * @param {string} bookingId - ID da reserva (ou temporário)
 * @returns {Promise<void>}
 */
async function blockPeriod(propertyId, checkIn, checkOut, bookingId) {
  const cacheKey = `block:${propertyId}:${checkIn}:${checkOut}`;

  // Verificar se Redis está disponível
  const redisHealthy = await isRedisHealthy();

  if (!redisHealthy) {
    console.warn("⚠️  Redis indisponível, bloqueio temporário não será aplicado (fallback ativo)");
    // Em fallback, não bloqueamos - confiamos na verificação do banco
    return;
  }

  try {
    // Bloquear por 15 minutos (900 segundos)
    await redisClient.setex(cacheKey, 900, bookingId);
  } catch (error) {
    console.warn("⚠️  Erro ao bloquear período no Redis:", error.message);
    // Não falhar se Redis estiver indisponível
  }
}

/**
 * Libera período bloqueado
 * @param {number} propertyId - ID da propriedade
 * @param {string} checkIn - Data de check-in
 * @param {string} checkOut - Data de check-out
 * @returns {Promise<void>}
 */
async function releasePeriod(propertyId, checkIn, checkOut) {
  const cacheKey = `block:${propertyId}:${checkIn}:${checkOut}`;

  try {
    await redisClient.del(cacheKey);
  } catch (error) {
    console.warn("⚠️  Erro ao liberar período no Redis:", error.message);
  }
}

/**
 * Verifica se período está bloqueado
 * @param {number} propertyId - ID da propriedade
 * @param {string} checkIn - Data de check-in
 * @param {string} checkOut - Data de check-out
 * @returns {Promise<{blocked: boolean, bookingId?: string}>}
 */
async function isPeriodBlocked(propertyId, checkIn, checkOut) {
  const cacheKey = `block:${propertyId}:${checkIn}:${checkOut}`;

  // Verificar se Redis está disponível
  const redisHealthy = await isRedisHealthy();

  if (!redisHealthy) {
    // Em fallback, assumir que não está bloqueado (confiar no banco)
    return { blocked: false };
  }

  try {
    const bookingId = await redisClient.get(cacheKey);
    return {
      blocked: !!bookingId,
      bookingId: bookingId || undefined,
    };
  } catch (error) {
    console.warn("⚠️  Erro ao verificar bloqueio no Redis:", error.message);
    // Em caso de erro, assumir não bloqueado (fallback)
    return { blocked: false };
  }
}

/**
 * Limpa cache de disponibilidade para uma propriedade
 * @param {number} propertyId - ID da propriedade
 * @returns {Promise<void>}
 */
async function clearAvailabilityCache(propertyId) {
  try {
    const pattern = `availability:${propertyId}:*`;
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (error) {
    console.warn("⚠️  Erro ao limpar cache:", error.message);
  }
}

module.exports = {
  checkAvailability,
  blockPeriod,
  releasePeriod,
  isPeriodBlocked,
  clearAvailabilityCache,
  isRedisHealthy, // Exportar para uso em outros serviços
  redisClient, // Exportar para uso em outros serviços
};

