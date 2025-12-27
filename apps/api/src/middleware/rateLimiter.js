/**
 * 🚦 Rate Limiter Middleware
 * FASE C7: Rate limiting específico por rota RSV360
 */

const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');

// rate-limit-redis v4+ usa exportação default
let RedisStore;
try {
  const rateLimitRedis = require('rate-limit-redis');
  // rate-limit-redis v4 exporta como { RedisStore, default }
  RedisStore = rateLimitRedis.RedisStore || rateLimitRedis.default || rateLimitRedis;
} catch (error) {
  // Fallback se rate-limit-redis não estiver disponível
  RedisStore = null;
}
const { createLogger } = require('../utils/logger');

const logger = createLogger({ service: 'rateLimiter' });

// Cliente Redis para rate limiting compartilhado
let redisClient = null;

try {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    db: parseInt(process.env.REDIS_DB || '0'),
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  redisClient.on('error', (err) => {
    logger.warn('Redis não disponível para rate limiting, usando memória local', { error: err.message });
    redisClient = null;
  });
} catch (error) {
  logger.warn('Erro ao conectar Redis para rate limiting, usando memória local', { error: error.message });
  redisClient = null;
}

/**
 * Criar rate limiter customizado
 * @param {Object} options - Opções do rate limiter
 * @param {number} options.windowMs - Janela de tempo em milissegundos
 * @param {number} options.max - Número máximo de requisições
 * @param {string} options.message - Mensagem de erro
 * @param {boolean} options.skipSuccessfulRequests - Pular requisições bem-sucedidas
 * @param {string} options.keyGenerator - Função para gerar chave única
 * @returns {Function} Middleware de rate limiting
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutos
    max = 100,
    message = 'Muitas requisições deste IP, tente novamente mais tarde.',
    skipSuccessfulRequests = false,
    keyGenerator = (req) => {
      // Usar IP do cliente ou user ID se autenticado
      return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
    },
  } = options;

  const limiterOptions = {
    windowMs,
    max,
    message: {
      error: 'Rate limit excedido',
      message,
      retryAfter: Math.ceil(windowMs / 1000), // segundos
    },
    standardHeaders: true, // Retornar rate limit info nos headers
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator,
    // Store: usar Redis se disponível, senão memória
    // Em ambiente de teste, sempre usar memória para evitar problemas
    store: redisClient && RedisStore && process.env.NODE_ENV !== 'test'
      ? (() => {
          try {
            return new RedisStore({
              sendCommand: async (...args) => {
                const result = await redisClient.call(...args);
                return result;
              },
              prefix: 'rl:',
            });
          } catch (error) {
            logger.error('Erro ao inicializar RedisStore, usando memória local', { error: error.message });
            return undefined;
          }
        })()
      : undefined, // Usar memória padrão se Redis não disponível ou em ambiente de teste
  };

  const limiter = rateLimit(limiterOptions);

  // Adicionar logging
  return (req, res, next) => {
    limiter(req, res, (err) => {
      if (err) {
        logger.warn('Rate limit excedido', {
          ip: req.ip,
          userId: req.user?.id,
          path: req.path,
          method: req.method,
        });
      }
      next(err);
    });
  };
}

/**
 * Rate limiter para rotas de bookings (crítico)
 * Limite: 20 requisições por 15 minutos
 */
const bookingsRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  message: 'Muitas requisições de reservas. Aguarde alguns minutos antes de tentar novamente.',
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter para rotas de payments (muito crítico)
 * Limite: 10 requisições por 15 minutos
 */
const paymentsRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: 'Muitas requisições de pagamento. Aguarde alguns minutos antes de tentar novamente.',
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter para rotas de properties (moderado)
 * Limite: 50 requisições por 15 minutos
 */
const propertiesRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50,
  message: 'Muitas requisições de propriedades. Aguarde alguns minutos antes de tentar novamente.',
  skipSuccessfulRequests: true, // Pular requisições bem-sucedidas (GET)
});

/**
 * Rate limiter para rotas públicas (mais permissivo)
 * Limite: 100 requisições por 15 minutos
 */
const publicRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: 'Muitas requisições. Aguarde alguns minutos antes de tentar novamente.',
  skipSuccessfulRequests: true,
});

/**
 * Rate limiter para autenticação (proteção contra brute force)
 * Limite: 5 tentativas por 15 minutos
 */
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: 'Muitas tentativas de login. Aguarde 15 minutos antes de tentar novamente.',
  skipSuccessfulRequests: false,
});

module.exports = {
  createRateLimiter,
  bookingsRateLimiter,
  paymentsRateLimiter,
  propertiesRateLimiter,
  publicRateLimiter,
  authRateLimiter,
};

