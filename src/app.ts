import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from 'dotenv';
import { errorHandler } from './middleware/error.middleware';
import { healthCheck, readinessCheck, startupCheck } from './middleware/health.middleware';
import { logger } from './utils/logger';

// Load environment variables
config();

const app = express();
const PORT = process.env['PORT'] || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env['CORS_ORIGIN']?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Compression and logging
app.use(compression());
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoints
app.get('/health', healthCheck);
app.get('/health/ready', readinessCheck);
app.get('/health/startup', startupCheck);

// API routes
app.get('/api/v1/status', (_req, res) => {
  res.json({
    success: true,
    message: 'RSV360 Ecosystem API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`RSV360 Ecosystem server running on port ${PORT}`);
    logger.info(`Environment: ${process.env['NODE_ENV'] || 'development'}`);
    logger.info(`Health check available at: http://localhost:${PORT}/health`);
  });
}

export default app;

