/**
 * 🗳️ Vote Service
 * FASE 2.1.2: Serviço de votação em itens de wishlist
 * Gerencia votos (up, down, maybe) com rate limiting e cache
 */

const { db, withTransaction } = require("../../config/database");
const advancedCacheService = require("../../services/advancedCacheService");
const { createLogger } = require("../../utils/logger");

const logger = createLogger({ service: 'voteService' });

// Rate limiting: 30 votos por minuto por usuário
const RATE_LIMIT_VOTES_PER_MINUTE = 30;

/**
 * Votar em um item de wishlist
 * 
 * @param {number} userId - ID do usuário
 * @param {number} itemId - ID do item
 * @param {'up'|'down'|'maybe'} voteType - Tipo de voto
 * @returns {Promise<Object>} Voto criado/atualizado
 */
async function vote(userId, itemId, voteType) {
  try {
    // Validar tipo de voto
    if (!['up', 'down', 'maybe'].includes(voteType)) {
      throw new Error("Tipo de voto inválido. Use 'up', 'down' ou 'maybe'");
    }

    // Verificar rate limiting
    await checkRateLimit(userId);

    return await withTransaction(async (trx) => {
      // Verificar se item existe
      const item = await trx("wishlist_items")
        .where("id", itemId)
        .first();

      if (!item) {
        throw new Error("Item de wishlist não encontrado");
      }

      // Verificar se usuário já votou
      const existingVote = await trx("wishlist_votes")
        .where({ user_id: userId, item_id: itemId })
        .first();

      let voteRecord;
      let voteCountChange = { up: 0, down: 0 };

      if (existingVote) {
        // Atualizar voto existente
        if (existingVote.vote === voteType) {
          // Mesmo voto, remover
          await trx("wishlist_votes")
            .where({ id: existingVote.id })
            .delete();

          // Decrementar contador
          if (voteType === 'up') {
            voteCountChange.up = -1;
          } else if (voteType === 'down') {
            voteCountChange.down = -1;
          }

          voteRecord = null;
        } else {
          // Mudar voto
          await trx("wishlist_votes")
            .where({ id: existingVote.id })
            .update({
              vote: voteType,
              timestamp: new Date(),
            });

          // Ajustar contadores
          if (existingVote.vote === 'up') {
            voteCountChange.up = -1;
          } else if (existingVote.vote === 'down') {
            voteCountChange.down = -1;
          }

          if (voteType === 'up') {
            voteCountChange.up = 1;
          } else if (voteType === 'down') {
            voteCountChange.down = 1;
          }

          voteRecord = await trx("wishlist_votes")
            .where({ id: existingVote.id })
            .first();
        }
      } else {
        // Criar novo voto
        const [newVote] = await trx("wishlist_votes").insert({
          user_id: userId,
          item_id: itemId,
          vote: voteType,
          timestamp: new Date(),
        }).returning("*");

        voteRecord = newVote;

        // Incrementar contador
        if (voteType === 'up') {
          voteCountChange.up = 1;
        } else if (voteType === 'down') {
          voteCountChange.down = 1;
        }
      }

      // Atualizar contadores no item
      const updates = {};
      if (voteCountChange.up !== 0) {
        updates.votes_up = db.raw(`GREATEST(0, votes_up + ${voteCountChange.up})`);
      }
      if (voteCountChange.down !== 0) {
        updates.votes_down = db.raw(`GREATEST(0, votes_down + ${voteCountChange.down})`);
      }

      if (Object.keys(updates).length > 0) {
        await trx("wishlist_items")
          .where("id", itemId)
          .update(updates);
      }

      // Invalidar cache
      await advancedCacheService.invalidateCache(`wishlist_item:${itemId}*`);
      await advancedCacheService.invalidateCache(`wishlist:${item.wishlist_id}*`);

      logger.info('Voto processado', { userId, itemId, voteType, action: existingVote ? 'updated' : 'created' });

      return voteRecord;
    });
  } catch (error) {
    logger.error('Erro ao votar', { userId, itemId, voteType, error: error.message });
    throw error;
  }
}

/**
 * Remover voto de um item
 */
async function removeVote(userId, itemId) {
  try {
    return await withTransaction(async (trx) => {
      const existingVote = await trx("wishlist_votes")
        .where({ user_id: userId, item_id: itemId })
        .first();

      if (!existingVote) {
        return null; // Voto não existe
      }

      await trx("wishlist_votes")
        .where({ id: existingVote.id })
        .delete();

      // Decrementar contador
      const updates = {};
      if (existingVote.vote === 'up') {
        updates.votes_up = db.raw("GREATEST(0, votes_up - 1)");
      } else if (existingVote.vote === 'down') {
        updates.votes_down = db.raw("GREATEST(0, votes_down - 1)");
      }

      if (Object.keys(updates).length > 0) {
        await trx("wishlist_items")
          .where("id", itemId)
          .update(updates);
      }

      // Buscar item para invalidar cache
      const item = await trx("wishlist_items")
        .where("id", itemId)
        .first();

      if (item) {
        await advancedCacheService.invalidateCache(`wishlist_item:${itemId}*`);
        await advancedCacheService.invalidateCache(`wishlist:${item.wishlist_id}*`);
      }

      logger.info('Voto removido', { userId, itemId });
      return { success: true };
    });
  } catch (error) {
    logger.error('Erro ao remover voto', { userId, itemId, error: error.message });
    throw error;
  }
}

/**
 * Obter todos os votos de um item
 */
async function getItemVotes(itemId) {
  try {
    const cacheKey = advancedCacheService.getCacheKey("wishlist_item_votes", itemId);
    
    return await advancedCacheService.cacheAside(
      cacheKey,
      async () => {
        const votes = await db("wishlist_votes")
          .select(
            "wishlist_votes.*",
            "users.name as user_name",
            "users.email as user_email"
          )
          .leftJoin("users", "wishlist_votes.user_id", "users.id")
          .where("wishlist_votes.item_id", itemId)
          .orderBy("wishlist_votes.timestamp", "desc");

        return votes.map(vote => ({
          id: vote.id,
          user_id: vote.user_id,
          item_id: vote.item_id,
          vote: vote.vote,
          timestamp: vote.timestamp,
          user: {
            name: vote.user_name,
            email: vote.user_email,
          },
        }));
      },
      300 // Cache por 5 minutos
    );
  } catch (error) {
    logger.error('Erro ao obter votos do item', { itemId, error: error.message });
    throw error;
  }
}

/**
 * Obter voto de um usuário em um item
 */
async function getUserVote(userId, itemId) {
  try {
    const vote = await db("wishlist_votes")
      .where({ user_id: userId, item_id: itemId })
      .first();

    return vote ? {
      id: vote.id,
      user_id: vote.user_id,
      item_id: vote.item_id,
      vote: vote.vote,
      timestamp: vote.timestamp,
    } : null;
  } catch (error) {
    logger.error('Erro ao obter voto do usuário', { userId, itemId, error: error.message });
    throw error;
  }
}

/**
 * Obter estatísticas de votos de um item
 */
async function getVotesStats(itemId) {
  try {
    const cacheKey = advancedCacheService.getCacheKey("wishlist_item_votes_stats", itemId);
    
    return await advancedCacheService.cacheAside(
      cacheKey,
      async () => {
        const item = await db("wishlist_items")
          .where("id", itemId)
          .first();

        if (!item) {
          throw new Error("Item não encontrado");
        }

        const votes = await db("wishlist_votes")
          .where("item_id", itemId)
          .select("vote");

        const stats = {
          total: votes.length,
          up: votes.filter(v => v.vote === 'up').length,
          down: votes.filter(v => v.vote === 'down').length,
          maybe: votes.filter(v => v.vote === 'maybe').length,
          votes_up: item.votes_up || 0,
          votes_down: item.votes_down || 0,
        };

        return stats;
      },
      300 // Cache por 5 minutos
    );
  } catch (error) {
    logger.error('Erro ao obter estatísticas de votos', { itemId, error: error.message });
    throw error;
  }
}

/**
 * Remover votos em lote (quando item é removido)
 */
async function bulkRemoveVotes(itemIds) {
  try {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return { removed: 0 };
    }

    const removed = await db("wishlist_votes")
      .whereIn("item_id", itemIds)
      .delete();

    // Invalidar cache
    for (const itemId of itemIds) {
      await advancedCacheService.invalidateCache(`wishlist_item:${itemId}*`);
    }

    logger.info('Votos removidos em lote', { itemIds, removed });
    return { removed };
  } catch (error) {
    logger.error('Erro ao remover votos em lote', { itemIds, error: error.message });
    throw error;
  }
}

/**
 * Verificar rate limiting de votos
 */
async function checkRateLimit(userId) {
  try {
    const cacheKey = `vote_rate_limit:${userId}`;
    const now = Date.now();
    const windowStart = now - 60000; // Último minuto

    // Buscar votos no último minuto
    const recentVotes = await db("wishlist_votes")
      .where("user_id", userId)
      .where("timestamp", ">", new Date(windowStart))
      .count("* as count")
      .first();

    const voteCount = parseInt(recentVotes?.count || 0);

    if (voteCount >= RATE_LIMIT_VOTES_PER_MINUTE) {
      throw new Error(`Limite de votos excedido. Máximo de ${RATE_LIMIT_VOTES_PER_MINUTE} votos por minuto.`);
    }

    return true;
  } catch (error) {
    if (error.message.includes('Limite de votos')) {
      throw error;
    }
    logger.warn('Erro ao verificar rate limit, permitindo voto', { userId, error: error.message });
    return true; // Em caso de erro, permitir voto
  }
}

module.exports = {
  vote,
  removeVote,
  getItemVotes,
  getUserVote,
  getVotesStats,
  bulkRemoveVotes,
};

