/**
 * 🛡️ Error Handler Middleware
 * FASE C8: Middleware padronizado de tratamento de erros
 */

const { createLogger } = require('../utils/logger');
const { AppError } = require('../utils/errors');

const logger = createLogger({ service: 'errorHandler' });

/**
 * Wrapper para async errors
 * Captura erros de funções async e passa para o error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware de tratamento de erros global
 */
const errorHandler = (err, req, res, next) => {
  // Se resposta já foi enviada, delegar para handler padrão do Express
  if (res.headersSent) {
    return next(err);
  }

  // Log do erro
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';

  // Determinar status code
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Erro interno do servidor';
  let code = err.code || 'INTERNAL_ERROR';
  let details = null;

  // Se for AppError (erro operacional), usar dados do erro
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details || null;

    // Log apenas se não for erro operacional esperado
    if (!err.isOperational || statusCode >= 500) {
      logger.error('Erro operacional', {
        code,
        message,
        statusCode,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        stack: isDevelopment ? err.stack : undefined,
      });
    } else {
      logger.warn('Erro operacional esperado', {
        code,
        message,
        statusCode,
        path: req.path,
        method: req.method,
      });
    }
  } else {
    // Erro não operacional (programming error)
    logger.error('Erro não operacional', {
      message: err.message,
      statusCode,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      stack: err.stack,
      error: err,
    });

    // Em produção, não expor detalhes de erros internos
    if (!isDevelopment && !isTest) {
      message = 'Erro interno do servidor';
      code = 'INTERNAL_ERROR';
    }
  }

  // Preparar resposta de erro
  const errorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(isDevelopment && { stack: err.stack }),
      ...(isDevelopment && err.originalError && { originalError: err.originalError.message }),
    },
    ...(isDevelopment && { path: req.path, method: req.method }),
  };

  // Headers adicionais
  if (err.retryAfter) {
    res.set('Retry-After', err.retryAfter);
  }

  // Enviar resposta
  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware para capturar erros 404 (não encontrado)
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
};

/**
 * Middleware para validar JSON malformado
 */
const jsonErrorHandler = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'JSON malformado',
      },
    });
  }
  next(err);
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  jsonErrorHandler,
};
