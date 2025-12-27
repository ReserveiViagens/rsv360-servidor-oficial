/**
 * ⚙️ Redis Configuration
 * FASE C3.1: Configuração Redis com eviction LRU
 * Gerencia memória Redis eficientemente
 */

/**
 * Obter configuração Redis com eviction
 * @returns {Object} Configuração do Redis
 */
function getRedisConfig() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    db: parseInt(process.env.REDIS_DB || '0'),
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableOfflineQueue: true,
    // FASE C3.1: Configurações de eviction
    // Nota: maxmemory e maxmemory-policy devem ser configurados no servidor Redis
    // Estas são apenas recomendações/documentação
    // Para configurar no Redis: CONFIG SET maxmemory 256mb
    // Para configurar política: CONFIG SET maxmemory-policy allkeys-lru
  };
}

/**
 * Configurar Redis com eviction (deve ser executado no servidor Redis)
 * FASE C3.1: Script para configurar eviction
 * @param {Object} redisClient - Cliente Redis
 * @returns {Promise<void>}
 */
async function configureRedisEviction(redisClient) {
  try {
    // Configurar maxmemory (256MB padrão, ajustável via env)
    const maxMemory = process.env.REDIS_MAX_MEMORY || '256mb';
    await redisClient.config('SET', 'maxmemory', maxMemory);
    console.log(`✅ Redis maxmemory configurado: ${maxMemory}`);

    // Configurar política de eviction (allkeys-lru)
    const evictionPolicy = process.env.REDIS_EVICTION_POLICY || 'allkeys-lru';
    await redisClient.config('SET', 'maxmemory-policy', evictionPolicy);
    console.log(`✅ Redis eviction policy configurado: ${evictionPolicy}`);

    // Verificar configuração
    const maxMemoryConfig = await redisClient.config('GET', 'maxmemory');
    const policyConfig = await redisClient.config('GET', 'maxmemory-policy');

    console.log('📊 Configuração Redis:');
    console.log(`   maxmemory: ${maxMemoryConfig[1]}`);
    console.log(`   maxmemory-policy: ${policyConfig[1]}`);
  } catch (error) {
    console.warn('⚠️  Erro ao configurar Redis eviction (pode não ter permissões):', error.message);
    console.warn('💡 Configure manualmente no Redis:');
    console.warn('   CONFIG SET maxmemory 256mb');
    console.warn('   CONFIG SET maxmemory-policy allkeys-lru');
  }
}

/**
 * Obter informações de memória Redis
 * @param {Object} redisClient - Cliente Redis
 * @returns {Promise<Object>} Informações de memória
 */
async function getRedisMemoryInfo(redisClient) {
  try {
    const info = await redisClient.info('memory');
    const lines = info.split('\r\n');
    const memoryInfo = {};

    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        memoryInfo[key] = value;
      }
    });

    return {
      used_memory: memoryInfo.used_memory_human || memoryInfo.used_memory,
      used_memory_peak: memoryInfo.used_memory_peak_human || memoryInfo.used_memory_peak,
      maxmemory: memoryInfo.maxmemory_human || memoryInfo.maxmemory,
      maxmemory_policy: memoryInfo.maxmemory_policy,
      evicted_keys: parseInt(memoryInfo.evicted_keys || '0'),
    };
  } catch (error) {
    console.warn('⚠️  Erro ao obter informações de memória Redis:', error.message);
    return null;
  }
}

module.exports = {
  getRedisConfig,
  configureRedisEviction,
  getRedisMemoryInfo,
};

