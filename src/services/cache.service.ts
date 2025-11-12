import Redis from 'redis';
import { logger } from '../utils/logger';

export class CacheService {
  private redis: Redis.RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.redis = Redis.createClient({
      url: process.env['REDIS_URL'] || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis connection error:', error);
    });

    this.redis.on('end', () => {
      this.isConnected = false;
      logger.warn('Redis connection ended');
    });
  }

  async connect(): Promise<void> {
    try {
      await this.redis.connect();
      logger.info('Cache service initialized');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      logger.info('Cache service disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }

  // Cache básico
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, returning null for key:', key);
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (value) {
        logger.debug(`Cache hit for key: ${key}`);
        return JSON.parse(value);
      }
      logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache set for key:', key);
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setEx(key, ttlSeconds, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }
      logger.debug(`Cache set for key: ${key}${ttlSeconds ? ` (TTL: ${ttlSeconds}s)` : ''}`);
      return true;
    } catch (error) {
      logger.error(`Error setting cache key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.redis.del(key);
      logger.debug(`Cache deleted for key: ${key}`);
      return result > 0;
    } catch (error) {
      logger.error(`Error deleting cache key ${key}:`, error);
      return false;
    }
  }

  // Cache com fallback
  async getOrSet<T>(
    key: string,
    fallbackFn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const freshData = await fallbackFn();
      await this.set(key, freshData, ttlSeconds);
      return freshData;
    } catch (error) {
      logger.error(`Error in getOrSet for key ${key}:`, error);
      throw error;
    }
  }

  // Cache de sessão
  async setSession(sessionId: string, data: any, ttlSeconds: number = 3600): Promise<boolean> {
    return this.set(`session:${sessionId}`, data, ttlSeconds);
  }

  async getSession<T>(sessionId: string): Promise<T | null> {
    return this.get<T>(`session:${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.del(`session:${sessionId}`);
  }

  // Cache de API
  async cacheApiResponse(
    endpoint: string,
    params: any,
    response: any,
    ttlSeconds: number = 600
  ): Promise<boolean> {
    const cacheKey = `api:${endpoint}:${JSON.stringify(params)}`;
    return this.set(cacheKey, response, ttlSeconds);
  }

  async getCachedApiResponse<T>(endpoint: string, params: any): Promise<T | null> {
    const cacheKey = `api:${endpoint}:${JSON.stringify(params)}`;
    return this.get<T>(cacheKey);
  }

  // Cache de métricas
  async cacheMetrics(serviceName: string, metrics: any, ttlSeconds: number = 60): Promise<boolean> {
    const cacheKey = `metrics:${serviceName}:${Date.now()}`;
    return this.set(cacheKey, metrics, ttlSeconds);
  }

  async getRecentMetrics(serviceName: string, minutes: number = 5): Promise<any[]> {
    if (!this.isConnected) {
      return [];
    }

    try {
      const pattern = `metrics:${serviceName}:*`;
      const keys = await this.redis.keys(pattern);
      const cutoffTime = Date.now() - (minutes * 60 * 1000);
      
      const recentKeys = keys.filter(key => {
        const timestamp = parseInt(key.split(':').pop() || '0');
        return timestamp > cutoffTime;
      });

      const metrics = [];
      for (const key of recentKeys) {
        const metric = await this.get(key);
        if (metric) {
          metrics.push(metric);
        }
      }

      return metrics.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      logger.error(`Error getting recent metrics for ${serviceName}:`, error);
      return [];
    }
  }

  // Cache de rate limiting
  async incrementRateLimit(key: string, windowSeconds: number = 60): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const current = await this.redis.incr(key);
      if (current === 1) {
        await this.redis.expire(key, windowSeconds);
      }
      return current;
    } catch (error) {
      logger.error(`Error incrementing rate limit for ${key}:`, error);
      return 0;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; connected: boolean; latency?: number }> {
    if (!this.isConnected) {
      return { status: 'disconnected', connected: false };
    }

    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        connected: true,
        latency
      };
    } catch (error) {
      return {
        status: 'error',
        connected: false
      };
    }
  }

  // Estatísticas
  async getStats(): Promise<any> {
    if (!this.isConnected) {
      return { connected: false };
    }

    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        connected: true,
        memory: info,
        keyspace: keyspace,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return { connected: false, error: error.message };
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();
