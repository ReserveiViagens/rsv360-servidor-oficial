/**
 * 🔐 Advanced Authentication Middleware
 * FASE 4.1-4.5: Autenticação avançada com validação rigorosa de JWT
 * Previne vulnerabilidades conhecidas de 2025 (alg:none, issuer/audience, etc)
 */

const jwt = require("jsonwebtoken");
const { RateLimiterMemory } = require("rate-limiter-flexible");
const Redis = require("ioredis");
const { checkRedisConnection } = require("../utils/redisHealth");

// Cliente Redis para blacklist (pode ser compartilhado ou separado)
const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  db: process.env.REDIS_DB || 0,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableOfflineQueue: true,
});

redisClient.on("error", (err) => {
  console.warn("⚠️  Redis connection error (blacklist may not work):", err.message);
});

// Rate limiter por IP
const rateLimiter = new RateLimiterMemory({
  points: parseInt(process.env.RATE_LIMIT_POINTS || 10), // 10 tentativas
  duration: parseInt(process.env.RATE_LIMIT_DURATION || 60), // por minuto
  blockDuration: parseInt(process.env.RATE_LIMIT_BLOCK_DURATION || 300), // Bloquear por 5 minutos após exceder
});

// Lista de algoritmos permitidos (CRÍTICO: Rejeitar alg:none)
const ALLOWED_ALGORITHMS =
  process.env.ALLOWED_ALGORITHMS?.split(",") || ["RS256", "ES256", "HS256"];

// Issuers e Audiences válidos
const VALID_ISSUERS = process.env.JWT_ISSUER
  ? [process.env.JWT_ISSUER]
  : ["rsv-360-ecosystem"];
const VALID_AUDIENCES = process.env.JWT_AUDIENCE
  ? [process.env.JWT_AUDIENCE]
  : ["rsv-360-users"];

/**
 * Validação rigorosa de JWT com proteção contra vulnerabilidades 2025
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
function advancedJWTValidation(req, res, next) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: "Token não fornecido",
        code: "NO_TOKEN",
      });
    }

    // Rate limiting por IP
    const clientIp =
      req.ip ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.connection.remoteAddress ||
      "unknown";

    rateLimiter
      .consume(clientIp)
      .then(() => {
        // Decodificar header sem verificar (apenas para inspeção)
        let decodedHeader;
        try {
          decodedHeader = jwt.decode(token, { complete: true });
        } catch (error) {
          return res.status(401).json({
            error: "Token inválido - não pode ser decodificado",
            code: "INVALID_TOKEN_FORMAT",
          });
        }

        if (!decodedHeader || !decodedHeader.header) {
          return res.status(401).json({
            error: "Token inválido",
            code: "INVALID_TOKEN",
          });
        }

        // CRÍTICO: Validar algoritmo (FASE 4.2)
        const algorithm = decodedHeader.header.alg;

        // CRÍTICO: Prevenir alg:none attack
        if (!algorithm || algorithm.toLowerCase() === "none") {
          console.error(
            `🚨 ALG:NONE ATTACK DETECTADO de IP: ${clientIp} - Token: ${token.substring(0, 20)}...`,
          );
          return res.status(401).json({
            error: "Algoritmo não permitido",
            code: "ALG_NONE_ATTACK",
          });
        }

        // Validar se algoritmo está na lista permitida
        if (!ALLOWED_ALGORITHMS.includes(algorithm)) {
          console.error(
            `⚠️  Tentativa de uso de algoritmo não permitido: ${algorithm} de IP: ${clientIp}`,
          );
          return res.status(401).json({
            error: "Algoritmo não permitido",
            code: "INVALID_ALGORITHM",
            allowed: ALLOWED_ALGORITHMS,
          });
        }

        // Verificar token com validações rigorosas (FASE 4.3)
        const secretOrKey =
          algorithm.startsWith("RS") || algorithm.startsWith("ES")
            ? process.env.JWT_PUBLIC_KEY || process.env.JWT_SECRET
            : process.env.JWT_SECRET;

        if (!secretOrKey) {
          console.error("❌ JWT_SECRET ou JWT_PUBLIC_KEY não configurado");
          return res.status(500).json({
            error: "Erro de configuração do servidor",
            code: "SERVER_CONFIG_ERROR",
          });
        }

        const options = {
          algorithms: ALLOWED_ALGORITHMS,
          issuer: VALID_ISSUERS,
          audience: VALID_AUDIENCES,
          clockTolerance: 10, // 10 segundos de tolerância para diferença de relógio
        };

        jwt.verify(token, secretOrKey, options, async (err, decoded) => {
          if (err) {
            console.error("❌ JWT verification failed:", err.message);

            // Log de tentativas suspeitas
            if (err.name === "TokenExpiredError") {
              return res.status(401).json({
                error: "Token expirado",
                code: "TOKEN_EXPIRED",
              });
            }

            if (err.name === "JsonWebTokenError") {
              return res.status(401).json({
                error: "Token inválido",
                code: "VERIFICATION_FAILED",
                message: err.message,
              });
            }

            return res.status(401).json({
              error: "Token inválido",
              code: "VERIFICATION_FAILED",
              message: err.message,
            });
          }

          // Validações adicionais de claims obrigatórias
          if (!decoded.sub) {
            return res.status(401).json({
              error: "Claims obrigatórias ausentes: sub",
              code: "MISSING_CLAIMS",
            });
          }

          // Verificar se token está na blacklist (Redis)
          // FASE B1.4: Melhorar fallback com verificação de saúde
          try {
            // Verificar se Redis está disponível antes de consultar blacklist
            const redisHealth = await checkRedisConnection(redisClient);
            
            if (redisHealth.connected) {
              const isBlacklisted = await redisClient.get(`blacklist:${token}`);
              if (isBlacklisted) {
                return res.status(401).json({
                  error: "Token revogado",
                  code: "TOKEN_REVOKED",
                });
              }
            } else {
              // Redis indisponível - fallback: permitir token (com log de warning)
              // Prioridade: melhor permitir acesso do que bloquear tudo
              console.warn(
                `⚠️  Redis indisponível para verificar blacklist (fallback ativo). Token permitido: ${token.substring(0, 20)}...`
              );
            }
          } catch (redisError) {
            // Se Redis não estiver disponível, continuar (fallback)
            console.warn("⚠️  Erro ao verificar blacklist (fallback ativo):", redisError.message);
          }

          // Adicionar informações do usuário ao request
          req.user = {
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role || "user",
            ...decoded,
          };

          next();
        });
      })
      .catch((rateLimitError) => {
        // Rate limit excedido
        const retryAfter = Math.ceil(rateLimitError.msBeforeNext / 1000);
        return res.status(429).json({
          error: "Muitas tentativas. Tente novamente em alguns minutos.",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: retryAfter,
        });
      });
  } catch (error) {
    console.error("❌ Auth middleware error:", error);
    res.status(500).json({
      error: "Erro interno de autenticação",
      code: "AUTH_INTERNAL_ERROR",
    });
  }
}

/**
 * Middleware para refresh token (FASE 4.5)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
async function refreshTokenMiddleware(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: "Refresh token não fornecido",
        code: "NO_REFRESH_TOKEN",
      });
    }

    // Verificar refresh token
    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      async (err, decoded) => {
        if (err) {
          return res.status(401).json({
            error: "Refresh token inválido",
            code: "INVALID_REFRESH_TOKEN",
          });
        }

        // Verificar se token está na blacklist
        // FASE B1.4: Melhorar fallback com verificação de saúde
        try {
          // Verificar se Redis está disponível antes de consultar blacklist
          const redisHealth = await checkRedisConnection(redisClient);
          
          if (redisHealth.connected) {
            const isBlacklisted = await redisClient.get(`blacklist:${refreshToken}`);
            if (isBlacklisted) {
              return res.status(401).json({
                error: "Token revogado",
                code: "TOKEN_REVOKED",
              });
            }
          } else {
            // Redis indisponível - fallback: permitir token (com log de warning)
            console.warn(
              `⚠️  Redis indisponível para verificar blacklist de refresh token (fallback ativo). Token permitido.`
            );
          }
        } catch (redisError) {
          console.warn("⚠️  Erro ao verificar blacklist (fallback ativo):", redisError.message);
        }

        // Gerar novos tokens
        const newAccessToken = jwt.sign(
          {
            sub: decoded.sub,
            email: decoded.email,
            role: decoded.role || "user",
          },
          process.env.JWT_SECRET,
          {
            expiresIn: process.env.JWT_EXPIRES_IN || "15m",
            issuer: VALID_ISSUERS[0],
            audience: VALID_AUDIENCES[0],
          },
        );

        const newRefreshToken = jwt.sign(
          { sub: decoded.sub },
          process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
          { expiresIn: "7d" },
        );

        // Blacklist o refresh token antigo
        // FASE B1.4: Melhorar fallback com verificação de saúde
        try {
          // Verificar se Redis está disponível antes de adicionar à blacklist
          const redisHealth = await checkRedisConnection(redisClient);
          
          if (redisHealth.connected) {
            await redisClient.setex(`blacklist:${refreshToken}`, 604800, "revoked"); // 7 dias
          } else {
            // Redis indisponível - fallback: não adicionar à blacklist (com log de warning)
            console.warn(
              `⚠️  Redis indisponível para adicionar à blacklist (fallback ativo). Token não será revogado até Redis voltar.`
            );
          }
        } catch (redisError) {
          console.warn("⚠️  Erro ao adicionar à blacklist (fallback ativo):", redisError.message);
        }

        res.json({
          success: true,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        });
      },
    );
  } catch (error) {
    console.error("❌ Refresh token error:", error);
    res.status(500).json({
      error: "Erro ao renovar token",
      code: "REFRESH_TOKEN_ERROR",
    });
  }
}

/**
 * Middleware para verificar roles/permissões
 * @param {Array<string>} allowedRoles - Roles permitidos
 * @returns {Function} Middleware function
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Não autenticado",
        code: "NOT_AUTHENTICATED",
      });
    }

    if (!req.user.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Acesso negado - Permissão insuficiente",
        code: "INSUFFICIENT_PERMISSIONS",
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
}

/**
 * Middleware para verificar ownership de recurso
 * @param {Function} getResourceOwnerId - Função que retorna o owner_id do recurso
 * @returns {Function} Middleware function
 */
function requireOwnership(getResourceOwnerId) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: "Não autenticado",
          code: "NOT_AUTHENTICATED",
        });
      }

      // Admin pode acessar qualquer recurso
      if (req.user.role === "admin") {
        return next();
      }

      const resourceOwnerId = await getResourceOwnerId(req);
      const userId = parseInt(req.user.id);

      if (resourceOwnerId !== userId) {
        return res.status(403).json({
          error: "Acesso negado - Recurso pertence a outro usuário",
          code: "RESOURCE_OWNERSHIP_DENIED",
        });
      }

      next();
    } catch (error) {
      console.error("❌ Ownership check error:", error);
      res.status(500).json({
        error: "Erro ao verificar permissões",
        code: "OWNERSHIP_CHECK_ERROR",
      });
    }
  };
}

module.exports = {
  advancedJWTValidation,
  refreshTokenMiddleware,
  requireRole,
  requireOwnership,
};

