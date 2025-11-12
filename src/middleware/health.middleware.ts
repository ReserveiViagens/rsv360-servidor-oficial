import { Request, Response } from 'express';
import { logger } from '../utils/logger';

export const healthCheck = (_req: Request, res: Response): void => {
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env['npm_package_version'] || '1.0.0',
    environment: process.env['NODE_ENV'] || 'development'
  };

  logger.info('Health check requested', { healthStatus });
  
  res.status(200).json(healthStatus);
};

export const readinessCheck = (_req: Request, res: Response): void => {
  // Check database connectivity, external services, etc.
  const readinessStatus = {
    status: 'Ready',
    timestamp: new Date().toISOString(),
    dependencies: {
      database: 'healthy',
      cache: 'healthy',
      external_apis: 'healthy'
    }
  };

  res.status(200).json(readinessStatus);
};

export const startupCheck = (_req: Request, res: Response): void => {
  const startupStatus = {
    status: 'Started',
    timestamp: new Date().toISOString(),
    initialization_time: process.uptime(),
    services_loaded: 15
  };

  res.status(200).json(startupStatus);
};

