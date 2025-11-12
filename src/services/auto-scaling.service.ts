import { logger } from '../utils/logger';
import { cacheService } from './cache.service';

export interface ScalingMetrics {
  cpuUsage: number;
  memoryUsage: number;
  requestRate: number;
  responseTime: number;
  errorRate: number;
  activeConnections: number;
}

export interface ScalingRule {
  name: string;
  metric: keyof ScalingMetrics;
  threshold: number;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  action: 'scale_up' | 'scale_down' | 'alert';
  cooldown: number; // segundos
  minInstances: number;
  maxInstances: number;
}

export class AutoScalingService {
  private rules: ScalingRule[] = [];
  private lastScalingAction: Map<string, number> = new Map();
  private currentInstances: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    this.rules = [
      {
        name: 'high_cpu_scale_up',
        metric: 'cpuUsage',
        threshold: 80,
        operator: 'gt',
        action: 'scale_up',
        cooldown: 300, // 5 minutos
        minInstances: 1,
        maxInstances: 10
      },
      {
        name: 'low_cpu_scale_down',
        metric: 'cpuUsage',
        threshold: 20,
        operator: 'lt',
        action: 'scale_down',
        cooldown: 600, // 10 minutos
        minInstances: 1,
        maxInstances: 10
      },
      {
        name: 'high_memory_scale_up',
        metric: 'memoryUsage',
        threshold: 85,
        operator: 'gt',
        action: 'scale_up',
        cooldown: 300,
        minInstances: 1,
        maxInstances: 10
      },
      {
        name: 'high_response_time_scale_up',
        metric: 'responseTime',
        threshold: 1000, // 1 segundo
        operator: 'gt',
        action: 'scale_up',
        cooldown: 180, // 3 minutos
        minInstances: 1,
        maxInstances: 10
      },
      {
        name: 'high_error_rate_alert',
        metric: 'errorRate',
        threshold: 5, // 5%
        operator: 'gt',
        action: 'alert',
        cooldown: 60, // 1 minuto
        minInstances: 1,
        maxInstances: 10
      }
    ];
  }

  async evaluateScaling(serviceName: string, metrics: ScalingMetrics): Promise<void> {
    try {
      logger.info(`Evaluating scaling for service: ${serviceName}`, { metrics });

      for (const rule of this.rules) {
        const shouldTrigger = this.evaluateRule(rule, metrics);
        
        if (shouldTrigger) {
          await this.executeScalingAction(serviceName, rule);
        }
      }

      // Salvar métricas no cache para análise histórica
      await cacheService.cacheMetrics(serviceName, {
        ...metrics,
        timestamp: Date.now(),
        serviceName
      }, 3600); // 1 hora

    } catch (error) {
      logger.error(`Error evaluating scaling for ${serviceName}:`, error);
    }
  }

  private evaluateRule(rule: ScalingRule, metrics: ScalingMetrics): boolean {
    const value = metrics[rule.metric];
    const threshold = rule.threshold;

    switch (rule.operator) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'gte':
        return value >= threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      default:
        return false;
    }
  }

  private async executeScalingAction(serviceName: string, rule: ScalingRule): Promise<void> {
    const now = Date.now();
    const lastAction = this.lastScalingAction.get(rule.name) || 0;
    const cooldownMs = rule.cooldown * 1000;

    // Verificar cooldown
    if (now - lastAction < cooldownMs) {
      logger.debug(`Scaling action ${rule.name} in cooldown for ${serviceName}`);
      return;
    }

    const currentInstances = this.currentInstances.get(serviceName) || 1;

    switch (rule.action) {
      case 'scale_up':
        if (currentInstances < rule.maxInstances) {
          await this.scaleUp(serviceName, rule);
        } else {
          logger.warn(`Cannot scale up ${serviceName}: already at max instances (${rule.maxInstances})`);
        }
        break;

      case 'scale_down':
        if (currentInstances > rule.minInstances) {
          await this.scaleDown(serviceName, rule);
        } else {
          logger.warn(`Cannot scale down ${serviceName}: already at min instances (${rule.minInstances})`);
        }
        break;

      case 'alert':
        await this.sendAlert(serviceName, rule);
        break;
    }

    this.lastScalingAction.set(rule.name, now);
  }

  private async scaleUp(serviceName: string, rule: ScalingRule): Promise<void> {
    const currentInstances = this.currentInstances.get(serviceName) || 1;
    const newInstances = Math.min(currentInstances + 1, rule.maxInstances);

    try {
      logger.info(`Scaling up ${serviceName} from ${currentInstances} to ${newInstances} instances`);
      
      // Simular scaling (em produção, aqui seria a chamada para o orquestrador)
      await this.simulateScaling(serviceName, newInstances);
      
      this.currentInstances.set(serviceName, newInstances);
      
      // Log da ação
      await this.logScalingAction(serviceName, 'scale_up', currentInstances, newInstances, rule);
      
    } catch (error) {
      logger.error(`Error scaling up ${serviceName}:`, error);
    }
  }

  private async scaleDown(serviceName: string, rule: ScalingRule): Promise<void> {
    const currentInstances = this.currentInstances.get(serviceName) || 1;
    const newInstances = Math.max(currentInstances - 1, rule.minInstances);

    try {
      logger.info(`Scaling down ${serviceName} from ${currentInstances} to ${newInstances} instances`);
      
      // Simular scaling (em produção, aqui seria a chamada para o orquestrador)
      await this.simulateScaling(serviceName, newInstances);
      
      this.currentInstances.set(serviceName, newInstances);
      
      // Log da ação
      await this.logScalingAction(serviceName, 'scale_down', currentInstances, newInstances, rule);
      
    } catch (error) {
      logger.error(`Error scaling down ${serviceName}:`, error);
    }
  }

  private async sendAlert(serviceName: string, rule: ScalingRule): Promise<void> {
    logger.warn(`ALERT: ${rule.name} triggered for ${serviceName}`, {
      serviceName,
      rule: rule.name,
      metric: rule.metric,
      threshold: rule.threshold,
      operator: rule.operator
    });

    // Em produção, aqui seria enviado para sistema de alertas
    await this.logScalingAction(serviceName, 'alert', 0, 0, rule);
  }

  private async simulateScaling(serviceName: string, instances: number): Promise<void> {
    // Simular delay de scaling
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    logger.info(`Simulated scaling of ${serviceName} to ${instances} instances`);
  }

  private async logScalingAction(
    serviceName: string,
    action: string,
    fromInstances: number,
    toInstances: number,
    rule: ScalingRule
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      serviceName,
      action,
      fromInstances,
      toInstances,
      rule: rule.name,
      metric: rule.metric,
      threshold: rule.threshold
    };

    // Salvar no cache para auditoria
    await cacheService.set(
      `scaling_log:${serviceName}:${Date.now()}`,
      logEntry,
      86400 // 24 horas
    );

    logger.info('Scaling action logged', logEntry);
  }

  // Métodos públicos para configuração
  addRule(rule: ScalingRule): void {
    this.rules.push(rule);
    logger.info(`Added scaling rule: ${rule.name}`);
  }

  removeRule(ruleName: string): boolean {
    const index = this.rules.findIndex(rule => rule.name === ruleName);
    if (index !== -1) {
      this.rules.splice(index, 1);
      logger.info(`Removed scaling rule: ${ruleName}`);
      return true;
    }
    return false;
  }

  getRules(): ScalingRule[] {
    return [...this.rules];
  }

  getCurrentInstances(serviceName: string): number {
    return this.currentInstances.get(serviceName) || 1;
  }

  setCurrentInstances(serviceName: string, instances: number): void {
    this.currentInstances.set(serviceName, instances);
    logger.info(`Set current instances for ${serviceName}: ${instances}`);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; rules: number; services: number }> {
    return {
      status: 'healthy',
      rules: this.rules.length,
      services: this.currentInstances.size
    };
  }

  // Estatísticas
  async getStats(): Promise<any> {
    const stats = {
      totalRules: this.rules.length,
      activeServices: this.currentInstances.size,
      currentInstances: Object.fromEntries(this.currentInstances),
      lastScalingActions: Object.fromEntries(this.lastScalingAction),
      timestamp: new Date().toISOString()
    };

    return stats;
  }
}

// Singleton instance
export const autoScalingService = new AutoScalingService();
