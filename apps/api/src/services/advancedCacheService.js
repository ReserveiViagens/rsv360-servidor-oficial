/**
 * 🚀 Advanced Cache Service
 * FASE 2.3: Cache avançado com warming e write-through
 * Sistema de cache Redis com estratégias avançadas
 */

const Redis = require("ioredis");
const { db } = require("../config/database");
const { checkRedisConnection, isRedisAvailable } = require("../utils/redisHealth");
const { getRedisConfig, configureRedisEviction, getRedisMemoryInfo } = require("../config/redis.config");

// Detectar ambiente de teste (deve ser definido antes de usar)
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;

// FASE C3.1: Configurar cliente Redis com configuração centralizada
const redisConfig = getRedisConfig();
const redis = new Redis(redisConfig);

// FASE C3.1: Configurar eviction ao conectar (apenas se não for ambiente de teste)
if (!isTestEnv) {
  redis.on('ready', async () => {
    try {
      await configureRedisEviction(redis);
    } catch (error) {
      // Ignorar erros de configuração (pode não ter permissões)
    }
  });
}

// Métricas de cache
let cacheHits = 0;
let cacheMisses = 0;

// FASE C3.2: Controle de chaves por namespace para LRU
const namespaceKeyCounts = new Map(); // namespace -> count
const namespaceKeyLimit = parseInt(process.env.CACHE_NAMESPACE_KEY_LIMIT || '1000'); // Limite por namespace
const globalKeyLimit = parseInt(process.env.CACHE_GLOBAL_KEY_LIMIT || '10000'); // Limite global

// Referências dos timers para limpeza
let warmupTimeout = null;
let warmupInterval = null;

// Event listeners (apenas se não for ambiente de teste)
if (!isTestEnv) {
  redis.on("error", (err) => {
    console.error("❌ Redis connection error:", err.message);
  });

  redis.on("connect", () => {
    console.log("✅ Advanced Cache Service - Redis connected");
  });
}

/**
 * Verifica se Redis está disponível e funcional
 * @returns {Promise<boolean>}
 */
async function isRedisHealthy() {
  try {
    const health = await checkRedisConnection(redis);
    return health.connected;
  } catch (error) {
    return false;
  }
}

/**
 * Cache-Aside (Lazy Loading)
 * Busca do cache primeiro, se não encontrar busca do banco e atualiza cache
 * @param {string} key - Chave do cache
 * @param {Function} fetchFunction - Função para buscar dados do banco
 * @param {number} ttl - Time to live em segundos (padrão: 1 hora)
 * @returns {Promise<any>} Dados do cache ou do banco
 */
async function cacheAside(key, fetchFunction, ttl = 3600) {
  // Verificar se Redis está disponível antes de tentar usar
  const redisHealthy = await isRedisHealthy();

  if (redisHealthy) {
    try {
      // Tentar pegar do cache
      const cached = await redis.get(key);

      if (cached) {
        cacheHits++;
        if (process.env.DEBUG === "true") {
          console.log(`✅ Cache HIT: ${key}`);
        }
        return JSON.parse(cached);
      }

      // Cache miss - buscar dos dados
      cacheMisses++;
      if (process.env.DEBUG === "true") {
        console.log(`⚠️  Cache MISS: ${key}`);
      }

    const data = await fetchFunction();

    if (data) {
      try {
        // FASE C3.2: Verificar e aplicar eviction LRU antes de adicionar
        await checkAndEvictIfNeeded(key);
        await redis.setex(key, ttl, JSON.stringify(data));
      } catch (cacheError) {
        console.warn(`⚠️  Erro ao salvar no cache (fallback ativo): ${cacheError.message}`);
      }
    }

      return data;
    } catch (error) {
      console.warn(`⚠️  Erro no cache (usando fallback): ${error.message}`);
      // Fallback: buscar diretamente do banco
      cacheMisses++;
      return await fetchFunction();
    }
  } else {
    // Redis indisponível - fallback direto para banco
    console.warn(`⚠️  Redis indisponível, usando fallback para banco de dados (key: ${key})`);
    cacheMisses++;
    return await fetchFunction();
  }
}

/**
 * Write-Through Cache
 * Salva no banco E no cache simultaneamente
 * @param {string} key - Chave do cache
 * @param {any} data - Dados para salvar
 * @param {Function} saveFunction - Função para salvar no banco
 * @param {number} ttl - Time to live em segundos
 * @returns {Promise<any>} Dados salvos
 */
async function writeThrough(key, data, saveFunction, ttl = 3600) {
  try {
    // Salvar no banco primeiro
    const savedData = await saveFunction(data);

    // Verificar se Redis está disponível antes de atualizar cache
    const redisHealthy = await isRedisHealthy();

    if (redisHealthy) {
      try {
        // FASE C3.2: Verificar e aplicar eviction LRU antes de atualizar
        await checkAndEvictIfNeeded(key);
        // Atualizar cache imediatamente
        await redis.setex(key, ttl, JSON.stringify(savedData));
      } catch (cacheError) {
        console.warn(`⚠️  Erro ao atualizar cache (fallback ativo): ${cacheError.message}`);
        // Continuar mesmo se cache falhar - dados já estão no banco
      }
    } else {
      console.warn(`⚠️  Redis indisponível, cache não atualizado (key: ${key})`);
    }

    return savedData;
  } catch (error) {
    console.error("❌ Write-through error:", error.message);
    throw error;
  }
}

/**
 * Write-Back Cache (Write-Behind)
 * Salva no cache primeiro, depois no banco de forma assíncrona
 * @param {string} key - Chave do cache
 * @param {any} data - Dados para salvar
 * @param {Function} saveFunction - Função para salvar no banco
 * @param {number} ttl - Time to live em segundos
 * @returns {Promise<any>} Dados salvos no cache
 */
async function writeBack(key, data, saveFunction, ttl = 3600) {
  // Verificar se Redis está disponível
  const redisHealthy = await isRedisHealthy();

  if (redisHealthy) {
    try {
      // FASE C3.2: Verificar e aplicar eviction LRU antes de adicionar
      await checkAndEvictIfNeeded(key);
      // Salvar no cache primeiro (resposta rápida)
      await redis.setex(key, ttl, JSON.stringify(data));

      // Salvar no banco de forma assíncrona (não bloqueia)
      setImmediate(async () => {
        try {
          await saveFunction(data);
        } catch (error) {
          console.error("❌ Write-back async save error:", error.message);
        }
      });

      return data;
    } catch (error) {
      console.warn(`⚠️  Erro no cache write-back (usando fallback): ${error.message}`);
      // Fallback: salvar diretamente no banco
      const savedData = await saveFunction(data);
      return savedData;
    }
  } else {
    // Redis indisponível - fallback direto para banco
    console.warn(`⚠️  Redis indisponível, usando fallback write-back para banco (key: ${key})`);
    const savedData = await saveFunction(data);
    return savedData;
  }
}

/**
 * Cache Invalidation
 * Remove chaves do cache baseado em padrão
 * @param {string} pattern - Padrão de chaves (ex: "property:*", "user:123:*")
 * @returns {Promise<number>} Número de chaves removidas
 */
async function invalidateCache(pattern) {
  // Verificar se Redis está disponível
  const redisHealthy = await isRedisHealthy();

  if (!redisHealthy) {
    console.warn(`⚠️  Redis indisponível, invalidação de cache ignorada (pattern: ${pattern})`);
    return 0;
  }

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      
      // FASE C3.2: Atualizar contadores de namespace
      const namespace = pattern.split(':')[0];
      if (namespace) {
        const currentCount = namespaceKeyCounts.get(namespace) || 0;
        namespaceKeyCounts.set(namespace, Math.max(0, currentCount - keys.length));
      }
      
      console.log(`🗑️  Invalidated ${keys.length} cache keys matching: ${pattern}`);
      return keys.length;
    }
    return 0;
  } catch (error) {
    console.error("❌ Cache invalidation error:", error.message);
    return 0;
  }
}

/**
 * Cache Warming - Pré-carregar dados críticos
 * Executa ao iniciar o servidor e periodicamente
 */
async function warmupCache() {
  // Não executar em ambiente de teste
  if (isTestEnv) {
    return;
  }

  // Verificar se DB está disponível
  if (!db) {
    return;
  }

  if (!isTestEnv) {
    console.log("🔥 Starting cache warmup...");
  }

  try {
    // 1. Carregar propriedades ativas mais populares
    try {
      const hasPropertiesTable = await db.schema.hasTable("properties");
      if (hasPropertiesTable) {
        const popularProperties = await db("properties")
          .where("status", "active")
          .orderBy("review_count", "desc")
          .limit(50);

        for (const property of popularProperties) {
          try {
            await redis.setex(
              `property:${property.id}`,
              7200, // 2 horas
              JSON.stringify(property),
            );
          } catch (redisError) {
            // Ignorar erros de Redis silenciosamente em ambiente de teste
            if (!isTestEnv) {
              console.error("❌ Redis error during property cache:", redisError.message);
            }
          }
        }

        if (!isTestEnv && popularProperties.length > 0) {
          console.log(`✅ Cached ${popularProperties.length} popular properties`);
        }
      }
    } catch (error) {
      // Ignorar se tabela não existir ou houver erro
      if (!isTestEnv) {
        console.warn("⚠️  Could not cache properties:", error.message);
      }
    }

    // 2. Carregar configurações do site
    try {
      const hasSettingsTable = await db.schema.hasTable("website_settings");
      if (hasSettingsTable) {
        const settings = await db("website_settings")
          .where("status", "active")
          .first();

        if (settings) {
          try {
            await redis.setex("website:settings", 3600, JSON.stringify(settings));
            if (!isTestEnv) {
              console.log("✅ Cached website settings");
            }
          } catch (redisError) {
            if (!isTestEnv) {
              console.error("❌ Redis error during settings cache:", redisError.message);
            }
          }
        }
      }
    } catch (error) {
      // Ignorar se tabela não existir
      if (!isTestEnv) {
        console.warn("⚠️  Could not cache website settings:", error.message);
      }
    }

    // 3. Carregar estatísticas gerais (se houver tabela de analytics)
    try {
      const hasBookingsTable = await db.schema.hasTable("bookings");
      const hasCustomersTable = await db.schema.hasTable("customers");
      const hasPropertiesTable = await db.schema.hasTable("properties");

      if (hasPropertiesTable && hasBookingsTable && hasCustomersTable) {
        const stats = {
          totalProperties: await db("properties").where("status", "active").count("* as count").first(),
          totalBookings: await db("bookings").where("status", "confirmed").count("* as count").first(),
          totalCustomers: await db("customers").count("* as count").first(),
        };

        try {
          await redis.setex("stats:general", 1800, JSON.stringify(stats)); // 30 minutos
          if (!isTestEnv) {
            console.log("✅ Cached general statistics");
          }
        } catch (redisError) {
          if (!isTestEnv) {
            console.error("❌ Redis error during stats cache:", redisError.message);
          }
        }
      }
    } catch (error) {
      // Ignorar se tabelas não existirem
      if (!isTestEnv) {
        console.warn("⚠️  Could not cache statistics:", error.message);
      }
    }

    if (!isTestEnv) {
      console.log("✅ Cache warmup completed");
    }
  } catch (error) {
    // Apenas logar se não for ambiente de teste
    if (!isTestEnv) {
      console.error("❌ Cache warmup error:", error.message);
    }
  }
}

/**
 * Get cache metrics
 * @returns {Object} Métricas do cache
 */
async function getCacheMetrics() {
  const total = cacheHits + cacheMisses;
  const hitRate = total > 0 ? ((cacheHits / total) * 100).toFixed(2) : 0;

  // FASE C3.2: Adicionar informações de memória e chaves
  let memoryInfo = null;
  let keyCounts = {};
  
  try {
    const redisHealthy = await isRedisHealthy();
    if (redisHealthy) {
      memoryInfo = await getRedisMemoryInfo(redis);
      
      // Contar chaves por namespace
      keyCounts = Object.fromEntries(namespaceKeyCounts);
    }
  } catch (error) {
    // Ignorar erros ao obter métricas
  }

  return {
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: `${hitRate}%`,
    total: total,
    // FASE C3.2: Métricas adicionais
    memory: memoryInfo,
    namespaceKeyCounts: keyCounts,
    namespaceKeyLimit: namespaceKeyLimit,
    globalKeyLimit: globalKeyLimit,
  };
}

/**
 * Reset cache metrics
 */
function resetCacheMetrics() {
  cacheHits = 0;
  cacheMisses = 0;
}

/**
 * Get cache key with namespace
 * @param {string} namespace - Namespace (ex: "property", "user")
 * @param {string|number} id - ID do recurso
 * @param {string} suffix - Sufixo opcional
 * @returns {string} Chave completa
 */
function getCacheKey(namespace, id, suffix = "") {
  return suffix ? `${namespace}:${id}:${suffix}` : `${namespace}:${id}`;
}

/**
 * Limpar timers de warmup
 * Útil para testes e shutdown graceful
 */
function clearWarmupTimers() {
  if (warmupTimeout) {
    clearTimeout(warmupTimeout);
    warmupTimeout = null;
  }
  if (warmupInterval) {
    clearInterval(warmupInterval);
    warmupInterval = null;
  }
}

// Executar warmup apenas se não for ambiente de teste
if (!isTestEnv) {
  warmupTimeout = setTimeout(() => {
    warmupCache();
  }, 5000);

  // Warmup periódico (a cada hora)
  warmupInterval = setInterval(warmupCache, 3600000); // 1 hora
}

// Função de eviction - remover chaves antigas quando necessário
async function evictOldKeys(pattern = '*') {
  if (isTestEnv) return 0;
  
  const redisHealthy = await isRedisHealthy();
  if (!redisHealthy) return 0;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      return keys.length;
    }
    return 0;
  } catch (error) {
    console.error('❌ Eviction error:', error.message);
    return 0;
  }
}

// Verificar e evictar se necessário
async function checkAndEvictIfNeeded(key) {
  if (isTestEnv) return false;
  
  const redisHealthy = await isRedisHealthy();
  if (!redisHealthy) return false;

  try {
    // Verificar se precisa evictar (implementação básica)
    const memoryInfo = await getRedisMemoryInfo();
    if (memoryInfo && memoryInfo.usedMemory > memoryInfo.maxMemory * 0.9) {
      // Se usar mais de 90% da memória, evictar chaves antigas
      await evictOldKeys('*:old:*');
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

module.exports = {
  cacheAside,
  writeThrough,
  writeBack,
  invalidateCache,
  warmupCache,
  getCacheMetrics,
  resetCacheMetrics,
  getCacheKey,
  clearWarmupTimers, // Exportar função para limpeza
  isRedisHealthy, // Exportar para verificação de saúde
  evictOldKeys, // FASE C3.2: Exportar função de eviction
  checkAndEvictIfNeeded, // FASE C3.2: Exportar função de verificação
  redis, // Exportar cliente Redis para uso em outros serviços
};

