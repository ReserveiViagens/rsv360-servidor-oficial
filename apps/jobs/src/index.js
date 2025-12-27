/**
 * 🚀 RSV 360 - Background Jobs Service
 * FASE 3.4: Serviço de jobs em background
 */

require('dotenv').config();

const { startAuctionStatusJob } = require('./jobs/auctionStatusJob');

// Logger simples para evitar dependências complexas
const logger = {
  info: (...args) => console.log('[JOBS-SERVICE]', ...args),
  error: (...args) => console.error('[JOBS-SERVICE ERROR]', ...args),
  warn: (...args) => console.warn('[JOBS-SERVICE WARN]', ...args),
};

console.log('🚀 RSV 360 Background Jobs service starting...');
logger.info('Iniciando serviço de jobs em background');

// Iniciar jobs
try {
  // Job de atualização de status de leilões (executa a cada minuto)
  const stopAuctionJob = startAuctionStatusJob();
  logger.info('✅ Job de atualização de status de leilões iniciado');

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM recebido. Parando jobs...');
    if (stopAuctionJob) {
      stopAuctionJob();
    }
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT recebido. Parando jobs...');
    if (stopAuctionJob) {
      stopAuctionJob();
    }
    process.exit(0);
  });

  logger.info('📍 Serviço de jobs pronto e rodando');
} catch (error) {
  logger.error('Erro ao iniciar jobs', { error: error.message });
  process.exit(1);
}
