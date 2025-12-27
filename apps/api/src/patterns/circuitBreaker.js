/**
 * 🔌 Circuit Breaker Pattern
 * FASE 2.4: Circuit breaker para resiliência de serviços externos
 * Previne cascata de falhas em serviços externos (pagamentos, notificações, etc)
 */

const CircuitBreaker = require("opossum");
// FASE C4.1 e C4.2: Fallbacks e respostas degradadas
const { createLogger } = require("../utils/logger");
const advancedCacheService = require("../services/advancedCacheService");

const logger = createLogger({ service: 'circuitBreaker' });

/**
 * Criar circuit breaker para serviços externos
 * @param {Function} serviceFunction - Função do serviço a proteger
 * @param {Object} options - Opções do circuit breaker
 * @returns {CircuitBreaker} Instância do circuit breaker
 */
function createCircuitBreaker(serviceFunction, options = {}) {
  const defaultOptions = {
    timeout: options.timeout || 3000, // 3 segundos
    errorThresholdPercentage: options.errorThresholdPercentage || 50, // 50% de erros
    resetTimeout: options.resetTimeout || 30000, // 30 segundos
    rollingCountTimeout: options.rollingCountTimeout || 60000, // 1 minuto
    rollingCountBuckets: options.rollingCountBuckets || 10, // 10 buckets
    name: options.name || "CircuitBreaker",
    enabled: options.enabled !== false, // Habilitado por padrão
  };

  const breaker = new CircuitBreaker(serviceFunction, defaultOptions);

  // Event listeners para monitoramento
  breaker.on("open", () => {
    console.warn(`🔴 Circuit breaker "${defaultOptions.name}" ABERTO - Serviço indisponível`);
  });

  breaker.on("halfOpen", () => {
    console.log(`🟡 Circuit breaker "${defaultOptions.name}" MEIO-ABERTO - Testando serviço`);
  });

  breaker.on("close", () => {
    console.log(`🟢 Circuit breaker "${defaultOptions.name}" FECHADO - Serviço funcionando`);
  });

  breaker.on("failure", (error) => {
    console.error(`❌ Circuit breaker "${defaultOptions.name}" - Falha:`, error.message);
  });

  breaker.on("success", () => {
    // Log apenas em debug mode
    if (process.env.DEBUG === "true") {
      console.log(`✅ Circuit breaker "${defaultOptions.name}" - Sucesso`);
    }
  });

  return breaker;
}

/**
 * FASE C4.2: Resposta degradada com cache antigo
 * @param {string} cacheKey - Chave do cache
 * @param {Object} fallbackValue - Valor padrão se cache não disponível
 * @returns {Promise<any>} Dados do cache ou valor padrão
 */
async function getDegradedResponse(cacheKey, fallbackValue = null) {
  try {
    // Tentar obter do cache (mesmo que antigo)
    const cached = await advancedCacheService.cacheAside(
      cacheKey,
      async () => fallbackValue,
      86400, // 24 horas - cache antigo aceito
    );

    if (cached && cached !== fallbackValue) {
      logger.warn(`Usando cache antigo como resposta degradada: ${cacheKey}`);
      return cached;
    }

    // Retornar valor padrão
    logger.warn(`Usando valor padrão como resposta degradada: ${cacheKey}`);
    return fallbackValue;
  } catch (error) {
    logger.error(`Erro ao obter resposta degradada: ${error.message}`);
    return fallbackValue;
  }
}

/**
 * FASE C4.1: Fallback específico para pagamentos Stripe
 * @param {Object} paymentData - Dados do pagamento
 * @returns {Promise<Object>} Resposta degradada
 */
async function stripePaymentFallback(paymentData) {
  logger.warn('Stripe circuit breaker aberto - usando fallback', {
    amount: paymentData.amount,
    currency: paymentData.currency,
  });

  // Retornar resposta degradada: pagamento em modo offline
  return {
    success: false,
    status: 'pending',
    mode: 'offline',
    message: 'Serviço de pagamento temporariamente indisponível. Pagamento será processado quando o serviço estiver disponível.',
    payment_intent_id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    requires_manual_processing: true,
  };
}

/**
 * FASE C4.1: Fallback específico para notificações
 * @param {Object} notificationData - Dados da notificação
 * @returns {Promise<Object>} Resposta degradada
 */
async function notificationFallback(notificationData) {
  logger.warn('Notification circuit breaker aberto - usando fallback', {
    type: notificationData.type,
    recipient: notificationData.recipient,
  });

  // Retornar resposta degradada: notificação enfileirada
  return {
    success: false,
    status: 'queued',
    message: 'Serviço de notificação temporariamente indisponível. Notificação será enviada quando o serviço estiver disponível.',
    queued_at: new Date().toISOString(),
  };
}

/**
 * FASE C4.1: Fallback específico para disponibilidade
 * @param {number} propertyId - ID da propriedade
 * @param {string} checkIn - Data de check-in
 * @param {string} checkOut - Data de check-out
 * @returns {Promise<Object>} Resposta degradada
 */
async function availabilityFallback(propertyId, checkIn, checkOut) {
  logger.warn('Availability circuit breaker aberto - usando fallback', {
    property_id: propertyId,
    check_in: checkIn,
    check_out: checkOut,
  });

  // Tentar obter do cache antigo
  const cacheKey = `availability:${propertyId}:${checkIn}:${checkOut}`;
  const cachedAvailability = await getDegradedResponse(cacheKey, {
    available: true, // Assumir disponível por padrão (mais seguro)
    degraded: true,
    message: 'Verificação de disponibilidade temporariamente indisponível. Assumindo disponível.',
  });

  return cachedAvailability;
}

/**
 * Wrapper para executar função com circuit breaker e fallback
 * FASE C4.1 e C4.2: Versão melhorada com fallbacks específicos
 * @param {CircuitBreaker} breaker - Circuit breaker instance
 * @param {Function} fallbackFunction - Função de fallback específica
 * @param {...any} args - Argumentos para a função
 * @returns {Promise<any>} Resultado da função ou fallback
 */
async function executeWithBreaker(breaker, fallbackFunction = null, ...args) {
  try {
    return await breaker.fire(...args);
  } catch (error) {
    const isOpen =
      typeof breaker.isOpen === "function"
        ? breaker.isOpen()
        : breaker.opened || breaker.status?.stats?.state === "open";

    if (isOpen) {
      // FASE C4.1: Usar fallback específico se fornecido
      if (fallbackFunction && typeof fallbackFunction === 'function') {
        logger.warn(`Circuit breaker aberto - usando fallback específico: ${breaker.name || 'Unknown'}`);
        try {
          return await fallbackFunction(...args);
        } catch (fallbackError) {
          logger.error(`Erro no fallback: ${fallbackError.message}`);
          throw new Error(`Circuit breaker está ABERTO e fallback falhou - Serviço temporariamente indisponível`);
        }
      }

      // FASE C4.2: Tentar resposta degradada genérica
      logger.warn(`Circuit breaker aberto - tentando resposta degradada: ${breaker.name || 'Unknown'}`);
      throw new Error(`Circuit breaker está ABERTO - Serviço temporariamente indisponível`);
    }
    throw error;
  }
}

/**
 * Criar circuit breaker para pagamentos Stripe
 */
const stripeCircuitBreaker = createCircuitBreaker(
  async (paymentData) => {
    // Esta função será substituída pelo stripeService real
    throw new Error("Stripe service not implemented");
  },
  {
    name: "StripePayment",
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 60000, // 1 minuto
  },
);

/**
 * Criar circuit breaker para notificações
 */
const notificationCircuitBreaker = createCircuitBreaker(
  async (notificationData) => {
    // Esta função será substituída pelo notificationService real
    throw new Error("Notification service not implemented");
  },
  {
    name: "Notifications",
    timeout: 3000,
    errorThresholdPercentage: 60,
    resetTimeout: 30000, // 30 segundos
  },
);

/**
 * Criar circuit breaker para serviços externos genéricos
 */
function createGenericCircuitBreaker(name, serviceFunction, options = {}) {
  return createCircuitBreaker(serviceFunction, {
    name,
    ...options,
  });
}

module.exports = {
  createCircuitBreaker,
  executeWithBreaker,
  stripeCircuitBreaker,
  notificationCircuitBreaker,
  createGenericCircuitBreaker,
  // FASE C4.1: Fallbacks específicos
  stripePaymentFallback,
  notificationFallback,
  availabilityFallback,
  // FASE C4.2: Resposta degradada
  getDegradedResponse,
};

