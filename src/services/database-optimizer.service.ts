import { logger } from '../utils/logger';
import { cacheService } from './cache.service';

export interface QueryMetrics {
  query: string;
  executionTime: number;
  rowsReturned: number;
  timestamp: number;
  serviceName: string;
}

export interface OptimizationRule {
  name: string;
  pattern: RegExp;
  suggestion: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  action: 'index' | 'rewrite' | 'cache' | 'partition';
}

export class DatabaseOptimizerService {
  private queryMetrics: QueryMetrics[] = [];
  private optimizationRules: OptimizationRule[] = [];
  private slowQueryThreshold: number = 1000; // 1 segundo
  private cacheHitRatio: Map<string, { hits: number; misses: number }> = new Map();

  constructor() {
    this.initializeOptimizationRules();
  }

  private initializeOptimizationRules(): void {
    this.optimizationRules = [
      {
        name: 'missing_index_select',
        pattern: /SELECT.*FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=/i,
        suggestion: 'Consider adding an index on the WHERE clause column',
        priority: 'high',
        action: 'index'
      },
      {
        name: 'missing_index_join',
        pattern: /JOIN\s+(\w+)\s+ON\s+(\w+\.\w+)\s*=\s*(\w+\.\w+)/i,
        suggestion: 'Consider adding indexes on join columns',
        priority: 'high',
        action: 'index'
      },
      {
        name: 'select_star',
        pattern: /SELECT\s+\*\s+FROM/i,
        suggestion: 'Avoid SELECT * - specify only needed columns',
        priority: 'medium',
        action: 'rewrite'
      },
      {
        name: 'nested_query',
        pattern: /SELECT.*\(SELECT.*FROM.*\)/i,
        suggestion: 'Consider using JOIN instead of nested query',
        priority: 'medium',
        action: 'rewrite'
      },
      {
        name: 'like_without_index',
        pattern: /WHERE\s+\w+\s+LIKE\s+['"]%[^'"]*['"]/i,
        suggestion: 'LIKE with leading wildcard cannot use indexes efficiently',
        priority: 'medium',
        action: 'rewrite'
      },
      {
        name: 'order_by_without_index',
        pattern: /ORDER\s+BY\s+(\w+)/i,
        suggestion: 'Consider adding index for ORDER BY column',
        priority: 'low',
        action: 'index'
      },
      {
        name: 'group_by_optimization',
        pattern: /GROUP\s+BY\s+(\w+)/i,
        suggestion: 'Consider adding index for GROUP BY column',
        priority: 'medium',
        action: 'index'
      }
    ];
  }

  async recordQueryMetrics(metrics: QueryMetrics): Promise<void> {
    try {
      this.queryMetrics.push(metrics);
      
      // Manter apenas as últimas 1000 métricas
      if (this.queryMetrics.length > 1000) {
        this.queryMetrics = this.queryMetrics.slice(-1000);
      }

      // Verificar se é uma query lenta
      if (metrics.executionTime > this.slowQueryThreshold) {
        await this.analyzeSlowQuery(metrics);
      }

      // Salvar no cache para análise
      await cacheService.set(
        `query_metrics:${metrics.serviceName}:${Date.now()}`,
        metrics,
        3600 // 1 hora
      );

      logger.debug(`Recorded query metrics for ${metrics.serviceName}`, {
        executionTime: metrics.executionTime,
        rowsReturned: metrics.rowsReturned
      });

    } catch (error) {
      logger.error('Error recording query metrics:', error);
    }
  }

  private async analyzeSlowQuery(metrics: QueryMetrics): Promise<void> {
    logger.warn(`Slow query detected: ${metrics.executionTime}ms`, {
      query: metrics.query.substring(0, 100) + '...',
      serviceName: metrics.serviceName,
      rowsReturned: metrics.rowsReturned
    });

    // Analisar a query e sugerir otimizações
    const optimizations = this.analyzeQuery(metrics.query);
    
    if (optimizations.length > 0) {
      await this.logOptimizationSuggestions(metrics, optimizations);
    }
  }

  private analyzeQuery(query: string): OptimizationRule[] {
    const suggestions: OptimizationRule[] = [];

    for (const rule of this.optimizationRules) {
      if (rule.pattern.test(query)) {
        suggestions.push(rule);
      }
    }

    return suggestions;
  }

  private async logOptimizationSuggestions(
    metrics: QueryMetrics,
    optimizations: OptimizationRule[]
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      serviceName: metrics.serviceName,
      query: metrics.query,
      executionTime: metrics.executionTime,
      optimizations: optimizations.map(opt => ({
        name: opt.name,
        suggestion: opt.suggestion,
        priority: opt.priority,
        action: opt.action
      }))
    };

    await cacheService.set(
      `optimization_suggestion:${metrics.serviceName}:${Date.now()}`,
      logEntry,
      86400 // 24 horas
    );

    logger.info('Query optimization suggestions', logEntry);
  }

  // Cache de queries
  async cacheQueryResult(
    query: string,
    params: any[],
    result: any,
    ttlSeconds: number = 300
  ): Promise<boolean> {
    const cacheKey = this.generateQueryCacheKey(query, params);
    return cacheService.set(cacheKey, result, ttlSeconds);
  }

  async getCachedQueryResult<T>(query: string, params: any[]): Promise<T | null> {
    const cacheKey = this.generateQueryCacheKey(query, params);
    const result = await cacheService.get<T>(cacheKey);
    
    if (result) {
      this.recordCacheHit(query);
    } else {
      this.recordCacheMiss(query);
    }
    
    return result;
  }

  private generateQueryCacheKey(query: string, params: any[]): string {
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    const paramsHash = JSON.stringify(params);
    return `query:${Buffer.from(normalizedQuery + paramsHash).toString('base64')}`;
  }

  private recordCacheHit(query: string): void {
    const key = this.getQueryKey(query);
    const stats = this.cacheHitRatio.get(key) || { hits: 0, misses: 0 };
    stats.hits++;
    this.cacheHitRatio.set(key, stats);
  }

  private recordCacheMiss(query: string): void {
    const key = this.getQueryKey(query);
    const stats = this.cacheHitRatio.get(key) || { hits: 0, misses: 0 };
    stats.misses++;
    this.cacheHitRatio.set(key, stats);
  }

  private getQueryKey(query: string): string {
    // Normalizar query para agrupar similares
    return query.replace(/\d+/g, '?').replace(/\s+/g, ' ').trim();
  }

  // Análise de performance
  async getPerformanceReport(serviceName?: string): Promise<any> {
    const metrics = serviceName 
      ? this.queryMetrics.filter(m => m.serviceName === serviceName)
      : this.queryMetrics;

    if (metrics.length === 0) {
      return { message: 'No query metrics available' };
    }

    const avgExecutionTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;
    const maxExecutionTime = Math.max(...metrics.map(m => m.executionTime));
    const minExecutionTime = Math.min(...metrics.map(m => m.executionTime));
    const slowQueries = metrics.filter(m => m.executionTime > this.slowQueryThreshold);
    const totalRows = metrics.reduce((sum, m) => sum + m.rowsReturned, 0);

    // Análise de cache
    const cacheStats = Array.from(this.cacheHitRatio.entries()).map(([query, stats]) => ({
      query,
      hitRatio: stats.hits / (stats.hits + stats.misses) * 100,
      totalRequests: stats.hits + stats.misses
    }));

    return {
      summary: {
        totalQueries: metrics.length,
        averageExecutionTime: Math.round(avgExecutionTime * 100) / 100,
        maxExecutionTime,
        minExecutionTime,
        slowQueries: slowQueries.length,
        totalRowsReturned: totalRows,
        cacheHitRatio: cacheStats.length > 0 
          ? cacheStats.reduce((sum, s) => sum + s.hitRatio, 0) / cacheStats.length 
          : 0
      },
      slowQueries: slowQueries.map(q => ({
        query: q.query.substring(0, 100) + '...',
        executionTime: q.executionTime,
        rowsReturned: q.rowsReturned,
        timestamp: new Date(q.timestamp).toISOString()
      })),
      cacheStats: cacheStats.sort((a, b) => b.totalRequests - a.totalRequests).slice(0, 10),
      timestamp: new Date().toISOString()
    };
  }

  // Sugestões de otimização
  async getOptimizationSuggestions(serviceName?: string): Promise<any> {
    const metrics = serviceName 
      ? this.queryMetrics.filter(m => m.serviceName === serviceName)
      : this.queryMetrics;

    const suggestions = new Map<string, { count: number; avgTime: number; rules: OptimizationRule[] }>();

    for (const metric of metrics) {
      const optimizations = this.analyzeQuery(metric.query);
      
      if (optimizations.length > 0) {
        const key = this.getQueryKey(metric.query);
        const existing = suggestions.get(key) || { count: 0, avgTime: 0, rules: [] };
        
        existing.count++;
        existing.avgTime = (existing.avgTime + metric.executionTime) / 2;
        existing.rules = [...new Set([...existing.rules, ...optimizations])];
        
        suggestions.set(key, existing);
      }
    }

    return Array.from(suggestions.entries()).map(([query, data]) => ({
      query: query.substring(0, 100) + '...',
      frequency: data.count,
      averageExecutionTime: Math.round(data.avgTime * 100) / 100,
      suggestions: data.rules.map(rule => ({
        name: rule.name,
        suggestion: rule.suggestion,
        priority: rule.priority,
        action: rule.action
      }))
    })).sort((a, b) => b.frequency - a.frequency);
  }

  // Configuração
  setSlowQueryThreshold(threshold: number): void {
    this.slowQueryThreshold = threshold;
    logger.info(`Slow query threshold set to ${threshold}ms`);
  }

  addOptimizationRule(rule: OptimizationRule): void {
    this.optimizationRules.push(rule);
    logger.info(`Added optimization rule: ${rule.name}`);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; metricsCount: number; rulesCount: number }> {
    return {
      status: 'healthy',
      metricsCount: this.queryMetrics.length,
      rulesCount: this.optimizationRules.length
    };
  }

  // Estatísticas
  async getStats(): Promise<any> {
    return {
      totalMetrics: this.queryMetrics.length,
      optimizationRules: this.optimizationRules.length,
      slowQueryThreshold: this.slowQueryThreshold,
      cacheStats: Object.fromEntries(this.cacheHitRatio),
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
export const databaseOptimizerService = new DatabaseOptimizerService();
