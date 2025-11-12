import { logger } from '../utils/logger';
import { cacheService } from './cache.service';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number; // milliseconds
  monitoringPeriod: number; // milliseconds
  halfOpenMaxCalls: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
  totalCalls: number;
  nextAttemptTime: number;
}

export class CircuitBreakerService {
  private circuits: Map<string, CircuitBreakerState> = new Map();
  private configs: Map<string, CircuitBreakerConfig> = new Map();
  private retryConfigs: Map<string, RetryConfig> = new Map();
  private defaultConfig: CircuitBreakerConfig;
  private defaultRetryConfig: RetryConfig;

  constructor() {
    this.defaultConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minuto
      monitoringPeriod: 10000, // 10 segundos
      halfOpenMaxCalls: 3
    };

    this.defaultRetryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 segundo
      maxDelay: 10000, // 10 segundos
      backoffMultiplier: 2,
      jitter: true
    };

    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs(): void {
    // Configurações específicas por serviço
    this.configs.set('api-gateway', {
      failureThreshold: 3,
      recoveryTimeout: 30000,
      monitoringPeriod: 5000,
      halfOpenMaxCalls: 2
    });

    this.configs.set('database', {
      failureThreshold: 5,
      recoveryTimeout: 120000,
      monitoringPeriod: 15000,
      halfOpenMaxCalls: 1
    });

    this.configs.set('external-api', {
      failureThreshold: 10,
      recoveryTimeout: 300000,
      monitoringPeriod: 30000,
      halfOpenMaxCalls: 5
    });

    // Configurações de retry específicas
    this.retryConfigs.set('database', {
      maxRetries: 5,
      baseDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 1.5,
      jitter: true
    });

    this.retryConfigs.set('external-api', {
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 15000,
      backoffMultiplier: 2,
      jitter: true
    });
  }

  async executeWithCircuitBreaker<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(serviceName);
    const config = this.configs.get(serviceName) || this.defaultConfig;

    // Verificar se o circuit breaker está aberto
    if (circuit.state === 'OPEN') {
      if (Date.now() < circuit.nextAttemptTime) {
        logger.warn(`Circuit breaker OPEN for ${serviceName}, using fallback`);
        if (fallback) {
          return await fallback();
        }
        throw new Error(`Circuit breaker is OPEN for ${serviceName}`);
      } else {
        // Tentar transição para HALF_OPEN
        circuit.state = 'HALF_OPEN';
        circuit.successCount = 0;
        logger.info(`Circuit breaker transitioning to HALF_OPEN for ${serviceName}`);
      }
    }

    // Verificar limite de chamadas em HALF_OPEN
    if (circuit.state === 'HALF_OPEN' && circuit.successCount >= config.halfOpenMaxCalls) {
      logger.warn(`Circuit breaker HALF_OPEN limit reached for ${serviceName}, using fallback`);
      if (fallback) {
        return await fallback();
      }
      throw new Error(`Circuit breaker HALF_OPEN limit reached for ${serviceName}`);
    }

    try {
      circuit.totalCalls++;
      const result = await operation();
      
      // Sucesso
      this.recordSuccess(serviceName);
      return result;

    } catch (error) {
      // Falha
      this.recordFailure(serviceName);
      
      logger.error(`Circuit breaker recorded failure for ${serviceName}:`, error);
      
      if (fallback) {
        logger.info(`Using fallback for ${serviceName}`);
        return await fallback();
      }
      
      throw error;
    }
  }

  async executeWithRetry<T>(
    serviceName: string,
    operation: () => Promise<T>,
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...customRetryConfig };
    let lastError: Error;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateDelay(attempt, retryConfig);
          logger.info(`Retrying ${serviceName} in ${delay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries + 1})`);
          await this.sleep(delay);
        }

        return await operation();

      } catch (error) {
        lastError = error as Error;
        
        if (attempt === retryConfig.maxRetries) {
          logger.error(`Max retries reached for ${serviceName}:`, error);
          break;
        }

        // Verificar se o erro é retryable
        if (!this.isRetryableError(error)) {
          logger.warn(`Non-retryable error for ${serviceName}:`, error);
          break;
        }

        logger.warn(`Retryable error for ${serviceName} (attempt ${attempt + 1}):`, error);
      }
    }

    throw lastError!;
  }

  async executeWithCircuitBreakerAndRetry<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>,
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const retryOperation = () => this.executeWithRetry(serviceName, operation, customRetryConfig);
    return this.executeWithCircuitBreaker(serviceName, retryOperation, fallback);
  }

  private getOrCreateCircuit(serviceName: string): CircuitBreakerState {
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0,
        totalCalls: 0,
        nextAttemptTime: 0
      });
    }
    return this.circuits.get(serviceName)!;
  }

  private recordSuccess(serviceName: string): void {
    const circuit = this.circuits.get(serviceName)!;
    
    if (circuit.state === 'HALF_OPEN') {
      circuit.successCount++;
      if (circuit.successCount >= (this.configs.get(serviceName) || this.defaultConfig).halfOpenMaxCalls) {
        circuit.state = 'CLOSED';
        circuit.failureCount = 0;
        logger.info(`Circuit breaker CLOSED for ${serviceName} after successful recovery`);
      }
    } else if (circuit.state === 'CLOSED') {
      circuit.failureCount = Math.max(0, circuit.failureCount - 1);
    }

    // Salvar estado no cache
    this.saveCircuitState(serviceName);
  }

  private recordFailure(serviceName: string): void {
    const circuit = this.circuits.get(serviceName)!;
    const config = this.configs.get(serviceName) || this.defaultConfig;
    
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();

    if (circuit.state === 'CLOSED' && circuit.failureCount >= config.failureThreshold) {
      circuit.state = 'OPEN';
      circuit.nextAttemptTime = Date.now() + config.recoveryTimeout;
      logger.warn(`Circuit breaker OPENED for ${serviceName} after ${circuit.failureCount} failures`);
    } else if (circuit.state === 'HALF_OPEN') {
      circuit.state = 'OPEN';
      circuit.nextAttemptTime = Date.now() + config.recoveryTimeout;
      logger.warn(`Circuit breaker OPENED for ${serviceName} during HALF_OPEN state`);
    }

    // Salvar estado no cache
    this.saveCircuitState(serviceName);
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, config.maxDelay);

    if (config.jitter) {
      // Adicionar jitter para evitar thundering herd
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  private isRetryableError(error: any): boolean {
    // Erros de rede/timeout são retryable
    if (error.code === 'ECONNREFUSED' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND' ||
        error.message?.includes('timeout') ||
        error.message?.includes('ECONNREFUSED')) {
      return true;
    }

    // Status HTTP 5xx são retryable
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // Status HTTP 429 (rate limit) é retryable
    if (error.status === 429) {
      return true;
    }

    return false;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async saveCircuitState(serviceName: string): Promise<void> {
    try {
      const circuit = this.circuits.get(serviceName);
      if (circuit) {
        await cacheService.set(`circuit_breaker:${serviceName}`, circuit, 3600); // 1 hora
      }
    } catch (error) {
      logger.error(`Error saving circuit state for ${serviceName}:`, error);
    }
  }

  // Métodos de configuração
  setCircuitBreakerConfig(serviceName: string, config: CircuitBreakerConfig): void {
    this.configs.set(serviceName, config);
    logger.info(`Circuit breaker config updated for ${serviceName}`, config);
  }

  setRetryConfig(serviceName: string, config: RetryConfig): void {
    this.retryConfigs.set(serviceName, config);
    logger.info(`Retry config updated for ${serviceName}`, config);
  }

  // Métodos de monitoramento
  getCircuitState(serviceName: string): CircuitBreakerState | null {
    return this.circuits.get(serviceName) || null;
  }

  getAllCircuitStates(): Map<string, CircuitBreakerState> {
    return new Map(this.circuits);
  }

  async getCircuitStats(): Promise<any> {
    const stats = {
      totalCircuits: this.circuits.size,
      circuitStates: {} as any,
      summary: {
        closed: 0,
        open: 0,
        halfOpen: 0
      }
    };

    for (const [serviceName, circuit] of this.circuits) {
      stats.circuitStates[serviceName] = {
        state: circuit.state,
        failureCount: circuit.failureCount,
        successCount: circuit.successCount,
        totalCalls: circuit.totalCalls,
        lastFailureTime: new Date(circuit.lastFailureTime).toISOString(),
        nextAttemptTime: circuit.nextAttemptTime > 0 ? new Date(circuit.nextAttemptTime).toISOString() : null
      };

      stats.summary[circuit.state.toLowerCase() as keyof typeof stats.summary]++;
    }

    return stats;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; circuitsCount: number; openCircuits: number }> {
    let openCircuits = 0;
    for (const circuit of this.circuits.values()) {
      if (circuit.state === 'OPEN') {
        openCircuits++;
      }
    }

    return {
      status: openCircuits > 0 ? 'degraded' : 'healthy',
      circuitsCount: this.circuits.size,
      openCircuits
    };
  }

  // Reset circuit breaker
  resetCircuit(serviceName: string): boolean {
    if (this.circuits.has(serviceName)) {
      const circuit = this.circuits.get(serviceName)!;
      circuit.state = 'CLOSED';
      circuit.failureCount = 0;
      circuit.successCount = 0;
      circuit.nextAttemptTime = 0;
      
      logger.info(`Circuit breaker reset for ${serviceName}`);
      this.saveCircuitState(serviceName);
      return true;
    }
    return false;
  }
}

// Singleton instance
export const circuitBreakerService = new CircuitBreakerService();
