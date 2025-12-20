/**
 * Mock para rate-limit-redis v4
 * Usado em ambiente de testes para evitar problemas com Redis
 */

class MockRedisStore {
  constructor(options) {
    this.options = options;
    this.store = new Map(); // Armazenamento em memória para testes
  }

  async increment(key, cb) {
    const current = this.store.get(key) || { totalHits: 0, resetTime: null };
    current.totalHits += 1;
    current.resetTime = current.resetTime || new Date(Date.now() + (this.options.windowMs || 900000));
    this.store.set(key, current);
    
    if (cb) {
      cb(null, {
        totalHits: current.totalHits,
        resetTime: current.resetTime,
      });
    }
    
    return {
      totalHits: current.totalHits,
      resetTime: current.resetTime,
    };
  }

  async decrement(key) {
    const current = this.store.get(key);
    if (current && current.totalHits > 0) {
      current.totalHits -= 1;
      this.store.set(key, current);
    }
    return current || { totalHits: 0, resetTime: null };
  }

  async resetKey(key) {
    this.store.delete(key);
  }

  async resetAll() {
    this.store.clear();
  }

  async shutdown() {
    this.store.clear();
  }
}

module.exports = {
  RedisStore: MockRedisStore,
  default: MockRedisStore,
};

