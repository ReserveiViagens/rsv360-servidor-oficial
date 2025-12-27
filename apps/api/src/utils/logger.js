/**
 * 📝 Logger Centralizado
 * FASE C2.1: Logger robusto usando Winston
 * Suporta múltiplos transports, rotação de arquivos e formatação estruturada
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Criar diretório de logs se não existir
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Definir níveis de log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Definir cores para cada nível
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Formato de log para desenvolvimento (texto colorido)
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`,
  ),
);

// Formato de log para produção (JSON estruturado)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Determinar formato baseado no ambiente
const isDevelopment = process.env.NODE_ENV !== 'production';
const logFormat = isDevelopment ? developmentFormat : productionFormat;

// Transports
const transports = [
  // Console transport (sempre ativo)
  new winston.transports.Console({
    format: logFormat,
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  }),

  // Arquivo de erros (rotação diária)
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: productionFormat,
    maxSize: '20m',
    maxFiles: '14d', // Manter 14 dias
    zippedArchive: true,
  }),

  // Arquivo de todos os logs (rotação diária)
  new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: productionFormat,
    maxSize: '20m',
    maxFiles: '30d', // Manter 30 dias
    zippedArchive: true,
  }),
];

// Criar instância do logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  levels,
  format: logFormat,
  transports,
  // Não sair do processo em caso de erro
  exitOnError: false,
  // Tratamento de exceções não capturadas
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: productionFormat,
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
  ],
  // Tratamento de rejeições de promises não tratadas
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: productionFormat,
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
  ],
});

/**
 * Logger com contexto para transações
 * FASE C2.2: Logger com contexto para facilitar rastreamento
 */
class ContextLogger {
  constructor(baseLogger, context = {}) {
    this.logger = baseLogger;
    this.context = context;
  }

  /**
   * Adicionar contexto adicional
   */
  withContext(additionalContext) {
    return new ContextLogger(this.logger, { ...this.context, ...additionalContext });
  }

  /**
   * Log de erro
   */
  error(message, meta = {}) {
    this.logger.error(message, { ...this.context, ...meta });
  }

  /**
   * Log de warning
   */
  warn(message, meta = {}) {
    this.logger.warn(message, { ...this.context, ...meta });
  }

  /**
   * Log de informação
   */
  info(message, meta = {}) {
    this.logger.info(message, { ...this.context, ...meta });
  }

  /**
   * Log de debug
   */
  debug(message, meta = {}) {
    this.logger.debug(message, { ...this.context, ...meta });
  }

  /**
   * Log de HTTP request
   */
  http(message, meta = {}) {
    this.logger.http(message, { ...this.context, ...meta });
  }
}

/**
 * Criar logger com contexto
 * @param {Object} context - Contexto inicial (ex: { service: 'bookingService', operation: 'createBooking' })
 * @returns {ContextLogger}
 */
function createLogger(context = {}) {
  return new ContextLogger(logger, context);
}

/**
 * Logger padrão (sem contexto)
 */
const defaultLogger = createLogger();

module.exports = {
  logger: defaultLogger,
  createLogger,
  winston,
};
