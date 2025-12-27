/**
 * 🏆 Top Host Service
 * FASE 1.3.2: Serviço de programa Top Host com cálculo de ratings e badges
 * Gerencia sistema de incentivos e recompensas para hosts
 */

const { db } = require("../config/database");
const advancedCacheService = require("./advancedCacheService");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ service: 'topHostService' });

/**
 * Calcular rating completo de um host
 * 
 * @param {number} hostId - ID do host (owner_id)
 * @returns {Promise<Object>} Rating completo com todas as métricas
 */
async function calculateHostRating(hostId) {
  try {
    logger.info('Calculando rating do host', { hostId });

    const cacheKey = advancedCacheService.getCacheKey("host_rating", hostId);
    
    return await advancedCacheService.cacheAside(
      cacheKey,
      async () => {
        // Buscar métricas do host
        const metrics = await db("host_metrics")
          .where("host_id", hostId)
          .first();

        if (!metrics) {
          // Criar métricas iniciais se não existir
          await initializeHostMetrics(hostId);
          return await calculateHostRating(hostId); // Recursão para calcular após inicialização
        }

        // Calcular ratings individuais
        const responseTimeRating = calculateResponseTimeRating(metrics.avg_response_time);
        const acceptanceRating = calculateAcceptanceRate(metrics.acceptance_rate);
        const cancellationRating = calculateCancellationRating(metrics.cancellation_rate);
        const cleanlinessRating = calculateCleanlinessRating(metrics.avg_cleanliness_score);

        // Calcular rating geral (média ponderada)
        const overallRating = (
          responseTimeRating * 0.2 +
          acceptanceRating * 0.3 +
          cancellationRating * 0.3 +
          cleanlinessRating * 0.2
        );

        // Atualizar métricas
        await db("host_metrics")
          .where("host_id", hostId)
          .update({
            overall_rating: overallRating,
            updated_at: new Date(),
          });

        // Verificar e conceder badges
        await checkAndGrantBadges(hostId, {
          responseTimeRating,
          acceptanceRating,
          cancellationRating,
          cleanlinessRating,
          overallRating,
        });

        return {
          host_id: hostId,
          overall_rating: overallRating,
          response_time_rating: responseTimeRating,
          acceptance_rating: acceptanceRating,
          cancellation_rating: cancellationRating,
          cleanliness_rating: cleanlinessRating,
          metrics: {
            avg_response_time: metrics.avg_response_time,
            acceptance_rate: metrics.acceptance_rate,
            cancellation_rate: metrics.cancellation_rate,
            avg_cleanliness_score: metrics.avg_cleanliness_score,
            total_bookings: metrics.total_bookings,
            total_reviews: metrics.total_reviews,
          },
        };
      },
      1800 // Cache por 30 minutos
    );
  } catch (error) {
    logger.error('Erro ao calcular rating do host', { hostId, error: error.message });
    throw error;
  }
}

/**
 * Inicializar métricas de um host
 */
async function initializeHostMetrics(hostId) {
  try {
    await db("host_metrics").insert({
      host_id: hostId,
      total_bookings: 0,
      total_reviews: 0,
      avg_response_time: 0,
      acceptance_rate: 100,
      cancellation_rate: 0,
      avg_cleanliness_score: 0,
      overall_rating: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });
  } catch (error) {
    logger.error('Erro ao inicializar métricas do host', { hostId, error: error.message });
    throw error;
  }
}

/**
 * Calcular rating de tempo de resposta
 */
function calculateResponseTimeRating(avgResponseTime) {
  // Tempo em horas
  if (avgResponseTime <= 1) {
    return 5.0; // Excelente: < 1 hora
  } else if (avgResponseTime <= 4) {
    return 4.5; // Muito bom: 1-4 horas
  } else if (avgResponseTime <= 12) {
    return 4.0; // Bom: 4-12 horas
  } else if (avgResponseTime <= 24) {
    return 3.0; // Regular: 12-24 horas
  } else {
    return 2.0; // Ruim: > 24 horas
  }
}

/**
 * Calcular rating de aceitação
 */
function calculateAcceptanceRate(acceptanceRate) {
  if (acceptanceRate >= 95) {
    return 5.0; // Excelente: >= 95%
  } else if (acceptanceRate >= 85) {
    return 4.5; // Muito bom: 85-94%
  } else if (acceptanceRate >= 75) {
    return 4.0; // Bom: 75-84%
  } else if (acceptanceRate >= 60) {
    return 3.0; // Regular: 60-74%
  } else {
    return 2.0; // Ruim: < 60%
  }
}

/**
 * Calcular rating de cancelamento
 */
function calculateCancellationRating(cancellationRate) {
  if (cancellationRate <= 1) {
    return 5.0; // Excelente: <= 1%
  } else if (cancellationRate <= 3) {
    return 4.5; // Muito bom: 1-3%
  } else if (cancellationRate <= 5) {
    return 4.0; // Bom: 3-5%
  } else if (cancellationRate <= 10) {
    return 3.0; // Regular: 5-10%
  } else {
    return 2.0; // Ruim: > 10%
  }
}

/**
 * Calcular rating de limpeza
 */
function calculateCleanlinessRating(avgCleanlinessScore) {
  if (avgCleanlinessScore >= 4.8) {
    return 5.0; // Excelente: >= 4.8
  } else if (avgCleanlinessScore >= 4.5) {
    return 4.5; // Muito bom: 4.5-4.7
  } else if (avgCleanlinessScore >= 4.0) {
    return 4.0; // Bom: 4.0-4.4
  } else if (avgCleanlinessScore >= 3.5) {
    return 3.0; // Regular: 3.5-3.9
  } else {
    return 2.0; // Ruim: < 3.5
  }
}

/**
 * Verificar e conceder badges
 */
async function checkAndGrantBadges(hostId, ratings) {
  try {
    const badges = [];

    // SuperHost: Rating geral >= 4.8 e >= 10 bookings
    if (ratings.overallRating >= 4.8) {
      const metrics = await db("host_metrics").where("host_id", hostId).first();
      if (metrics && metrics.total_bookings >= 10) {
        badges.push('super_host');
      }
    }

    // Fast Responder: Tempo de resposta <= 1 hora
    if (ratings.responseTimeRating >= 5.0) {
      badges.push('fast_responder');
    }

    // Highly Rated: Rating de limpeza >= 4.8
    if (ratings.cleanlinessRating >= 5.0) {
      badges.push('highly_rated');
    }

    // Reliable: Taxa de cancelamento <= 1%
    if (ratings.cancellationRating >= 5.0) {
      badges.push('reliable');
    }

    // Conceder badges
    for (const badgeType of badges) {
      await grantBadge(hostId, badgeType);
    }
  } catch (error) {
    logger.warn('Erro ao verificar badges', { hostId, error: error.message });
  }
}

/**
 * Conceder badge a um host
 */
async function grantBadge(hostId, badgeType) {
  try {
    // Verificar se badge já existe
    const existing = await db("host_badges")
      .where({ host_id: hostId, badge_type: badgeType })
      .first();

    if (!existing) {
      await db("host_badges").insert({
        host_id: hostId,
        badge_type: badgeType,
        granted_at: new Date(),
        created_at: new Date(),
      });

      logger.info('Badge concedido', { hostId, badgeType });
    }
  } catch (error) {
    logger.error('Erro ao conceder badge', { hostId, badgeType, error: error.message });
    throw error;
  }
}

/**
 * Obter leaderboard de top hosts
 */
async function getTopHostsLeaderboard(limit = 20) {
  try {
    const cacheKey = advancedCacheService.getCacheKey("top_hosts_leaderboard", limit);
    
    return await advancedCacheService.cacheAside(
      cacheKey,
      async () => {
        const hosts = await db("host_metrics")
          .select(
            "host_metrics.*",
            "owners.name as host_name",
            "owners.email as host_email"
          )
          .leftJoin("owners", "host_metrics.host_id", "owners.id")
          .where("host_metrics.total_bookings", ">=", 5) // Mínimo de 5 bookings
          .orderBy("host_metrics.overall_rating", "desc")
          .limit(limit);

        // Buscar badges de cada host
        const hostsWithBadges = await Promise.all(
          hosts.map(async (host) => {
            const badges = await db("host_badges")
              .where("host_id", host.host_id)
              .select("badge_type", "granted_at");

            return {
              ...host,
              badges: badges.map(b => b.badge_type),
            };
          })
        );

        return hostsWithBadges;
      },
      1800 // Cache por 30 minutos
    );
  } catch (error) {
    logger.error('Erro ao obter leaderboard', { error: error.message });
    throw error;
  }
}

/**
 * Obter badges de um host
 */
async function getHostBadges(hostId) {
  try {
    const badges = await db("host_badges")
      .where("host_id", hostId)
      .orderBy("granted_at", "desc");

    return badges.map(badge => ({
      badge_type: badge.badge_type,
      granted_at: badge.granted_at,
    }));
  } catch (error) {
    logger.error('Erro ao obter badges do host', { hostId, error: error.message });
    throw error;
  }
}

/**
 * Atualizar métricas do host após evento (booking, review, etc.)
 */
async function updateHostMetrics(hostId, eventType, eventData) {
  try {
    const metrics = await db("host_metrics")
      .where("host_id", hostId)
      .first();

    if (!metrics) {
      await initializeHostMetrics(hostId);
      return await updateHostMetrics(hostId, eventType, eventData);
    }

    let updates = {};

    switch (eventType) {
      case 'booking_created':
        updates.total_bookings = db.raw('total_bookings + 1');
        break;
      case 'booking_accepted':
        // Atualizar taxa de aceitação
        const totalRequests = metrics.total_bookings || 1;
        const acceptedCount = await db("bookings")
          .where("property_id", "in", db("properties").select("id").where("owner_id", hostId))
          .where("status", "confirmed")
          .count("* as count")
          .first();
        
        updates.acceptance_rate = (acceptedCount.count / totalRequests) * 100;
        break;
      case 'booking_cancelled':
        // Atualizar taxa de cancelamento
        const cancelledCount = await db("bookings")
          .where("property_id", "in", db("properties").select("id").where("owner_id", hostId))
          .where("status", "cancelled")
          .count("* as count")
          .first();
        
        updates.cancellation_rate = (cancelledCount.count / totalRequests) * 100;
        break;
      case 'review_created':
        updates.total_reviews = db.raw('total_reviews + 1');
        if (eventData.cleanliness_score) {
          // Atualizar média de limpeza
          const avgScore = await db("reviews")
            .where("property_id", "in", db("properties").select("id").where("owner_id", hostId))
            .avg("cleanliness_score as avg")
            .first();
          
          updates.avg_cleanliness_score = parseFloat(avgScore.avg || 0);
        }
        break;
      case 'message_responded':
        if (eventData.response_time) {
          // Atualizar tempo médio de resposta
          const avgTime = await db("messages")
            .where("sender_id", hostId)
            .avg("response_time as avg")
            .first();
          
          updates.avg_response_time = parseFloat(avgTime.avg || 0);
        }
        break;
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date();
      await db("host_metrics")
        .where("host_id", hostId)
        .update(updates);

      // Invalidar cache
      await advancedCacheService.invalidateCache(`host_rating:${hostId}*`);
      await advancedCacheService.invalidateCache("top_hosts_leaderboard:*");
    }
  } catch (error) {
    logger.error('Erro ao atualizar métricas do host', { hostId, eventType, error: error.message });
    throw error;
  }
}

module.exports = {
  calculateHostRating,
  getTopHostsLeaderboard,
  getHostBadges,
  updateHostMetrics,
  grantBadge,
};

