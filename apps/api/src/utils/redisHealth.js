/**
 * 🔍 Redis Health Check Utility
 * FASE B1.1: Utilitário para verificar conexão Redis
 * Usado por todos os services que dependem de Redis
 */

const Redis = require("ioredis");

// Cache de status de conexão (evitar múltiplas verificações simultâneas)
let connectionStatusCache = {
  connected: null,
  lastCheck: null,
  error: null,
};

// Tempo de cache do status (5 segundos)
const STATUS_CACHE_TTL = 5000;

/**
 * Verifica conexão Redis de forma eficiente
 * @param {Redis} redisClient - Cliente Redis a verificar (opcional, cria novo se não fornecido)
 * @returns {Promise<{connected: boolean, error: string|null, latency?: number}>}
 */
async function checkRedisConnection(redisClient = null) {
  // Verificar cache primeiro
  const now = Date.now();
  if (
    connectionStatusCache.connected !== null &&
    connectionStatusCache.lastCheck &&
    now - connectionStatusCache.lastCheck < STATUS_CACHE_TTL
  ) {
    return {
      connected: connectionStatusCache.connected,
      error: connectionStatusCache.error,
    };
  }

  // Criar cliente temporário se não fornecido
  const client = redisClient || createTemporaryRedisClient();

  try {
    const startTime = Date.now();
    const result = await Promise.race([
      client.ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 2000),
      ),
    ]);
    const latency = Date.now() - startTime;

    // Atualizar cache
    connectionStatusCache = {
      connected: result === "PONG",
      lastCheck: now,
      error: null,
    };

    // Fechar cliente temporário se criado
    if (!redisClient) {
      client.disconnect();
    }

    return {
      connected: result === "PONG",
      error: null,
      latency,
    };
  } catch (error) {
    // Atualizar cache com erro
    connectionStatusCache = {
      connected: false,
      lastCheck: now,
      error: error.message,
    };

    // Fechar cliente temporário se criado
    if (!redisClient) {
      try {
        client.disconnect();
      } catch (e) {
        // Ignorar erros ao fechar
      }
    }

    return {
      connected: false,
      error: error.message,
    };
  }
}

/**
 * Cria cliente Redis temporário para verificação
 * @returns {Redis}
 */
function createTemporaryRedisClient() {
  return new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    db: process.env.REDIS_DB || 0,
    password: process.env.REDIS_PASSWORD || undefined,
    connectTimeout: 2000,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
}

/**
 * Limpa cache de status (útil para testes)
 */
function clearStatusCache() {
  connectionStatusCache = {
    connected: null,
    lastCheck: null,
    error: null,
  };
}

/**
 * Verifica se Redis está disponível (versão síncrona do cache)
 * @returns {boolean}
 */
function isRedisAvailable() {
  if (connectionStatusCache.connected === null) {
    return true; // Assumir disponível se nunca foi verificado
  }
  return connectionStatusCache.connected;
}

module.exports = {
  checkRedisConnection,
  clearStatusCache,
  isRedisAvailable,
};

