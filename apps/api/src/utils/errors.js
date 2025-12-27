/**
 * 🚨 Custom Error Classes
 * FASE C8: Classes de erro padronizadas para tratamento consistente
 */

/**
 * Classe base para erros customizados
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || this.constructor.name;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erro de validação (400)
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

/**
 * Erro de autenticação (401)
 */
class AuthenticationError extends AppError {
  constructor(message = 'Não autenticado') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Erro de autorização (403)
 */
class AuthorizationError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Erro de recurso não encontrado (404)
 */
class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} não encontrado`, 404, 'NOT_FOUND_ERROR');
  }
}

/**
 * Erro de conflito (409)
 */
class ConflictError extends AppError {
  constructor(message, details = null) {
    super(message, 409, 'CONFLICT_ERROR');
    this.details = details;
  }
}

/**
 * Erro de serviço externo indisponível (503)
 */
class ServiceUnavailableError extends AppError {
  constructor(service = 'Serviço', message = null) {
    super(
      message || `${service} temporariamente indisponível`,
      503,
      'SERVICE_UNAVAILABLE_ERROR',
    );
  }
}

/**
 * Erro de rate limit (429)
 */
class RateLimitError extends AppError {
  constructor(message = 'Muitas requisições. Tente novamente mais tarde.') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

/**
 * Erro de banco de dados (500)
 */
class DatabaseError extends AppError {
  constructor(message = 'Erro no banco de dados', originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

/**
 * Erro de processamento de pagamento (402)
 */
class PaymentError extends AppError {
  constructor(message, gateway = null, details = null) {
    super(message, 402, 'PAYMENT_ERROR');
    this.gateway = gateway;
    this.details = details;
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ServiceUnavailableError,
  RateLimitError,
  DatabaseError,
  PaymentError,
};

