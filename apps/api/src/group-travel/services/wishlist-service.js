/**
 * 📋 Wishlist Service
 * FASE 2.1.6: Serviço principal de wishlists compartilhadas
 * Gerencia wishlists, membros, itens e permissões
 */

const { db, withTransaction } = require("../../config/database");
const advancedCacheService = require("../../services/advancedCacheService");
const notificationService = require("../../services/notificationService");
const voteService = require("./vote-service");
const { createLogger } = require("../../utils/logger");

const logger = createLogger({ service: 'wishlistService' });

/**
 * Criar nova wishlist compartilhada
 * 
 * @param {number} userId - ID do criador
 * @param {string} name - Nome da wishlist
 * @param {string[]} [memberEmails] - Emails dos membros iniciais
 * @returns {Promise<Object>} Wishlist criada
 */
async function createWishlist(userId, name, memberEmails = []) {
  try {
    return await withTransaction(async (trx) => {
      // Criar wishlist
      const [wishlist] = await trx("shared_wishlists").insert({
        name: name.trim(),
        created_by: userId,
        created_at: new Date(),
        updated_at: new Date(),
      }).returning("*");

      // Adicionar criador como admin
      await trx("wishlist_members").insert({
        wishlist_id: wishlist.id,
        user_id: userId,
        role: 'admin',
        joined_at: new Date(),
      });

      // Adicionar membros iniciais
      if (memberEmails && memberEmails.length > 0) {
        for (const email of memberEmails) {
          try {
            const user = await trx("users")
              .where("email", email.toLowerCase().trim())
              .first();

            if (user && user.id !== userId) {
              await trx("wishlist_members").insert({
                wishlist_id: wishlist.id,
                user_id: user.id,
                role: 'member',
                joined_at: new Date(),
              });

              // Enviar notificação
              try {
                await notificationService.notifyWishlistInvitation(wishlist.id, user.id);
              } catch (error) {
                logger.warn('Erro ao enviar notificação de wishlist', { 
                  wishlistId: wishlist.id, 
                  userId: user.id,
                  error: error.message 
                });
              }
            }
          } catch (error) {
            logger.warn('Erro ao adicionar membro inicial', { email, error: error.message });
          }
        }
      }

      logger.info('Wishlist criada', { wishlistId: wishlist.id, userId, membersCount: memberEmails.length });

      return wishlist;
    });
  } catch (error) {
    logger.error('Erro ao criar wishlist', { userId, name, error: error.message });
    throw error;
  }
}

/**
 * Obter wishlist com membros e itens
 */
async function getWishlist(wishlistId, userId) {
  try {
    // Verificar se usuário tem acesso
    await checkWishlistAccess(wishlistId, userId);

    const cacheKey = advancedCacheService.getCacheKey("wishlist", wishlistId, userId);
    
    return await advancedCacheService.cacheAside(
      cacheKey,
      async () => {
        const wishlist = await db("shared_wishlists")
          .where("id", wishlistId)
          .first();

        if (!wishlist) {
          throw new Error("Wishlist não encontrada");
        }

        // Buscar membros
        const members = await db("wishlist_members")
          .select(
            "wishlist_members.*",
            "users.name as user_name",
            "users.email as user_email",
            "users.avatar_url as user_avatar"
          )
          .leftJoin("users", "wishlist_members.user_id", "users.id")
          .where("wishlist_members.wishlist_id", wishlistId)
          .orderBy("wishlist_members.joined_at", "asc");

        // Buscar itens
        const items = await db("wishlist_items")
          .select(
            "wishlist_items.*",
            "properties.title as property_title",
            "properties.base_price as property_price",
            "properties.images as property_images",
            "properties.address_city as property_location"
          )
          .leftJoin("properties", "wishlist_items.property_id", "properties.id")
          .where("wishlist_items.wishlist_id", wishlistId)
          .orderBy("wishlist_items.added_at", "desc");

        // Buscar voto do usuário para cada item
        const itemsWithVotes = await Promise.all(
          items.map(async (item) => {
            const userVote = await voteService.getUserVote(userId, item.id);
            return {
              ...item,
              property: {
                id: item.property_id,
                title: item.property_title,
                price: parseFloat(item.property_price || 0),
                images: item.property_images ? JSON.parse(item.property_images) : [],
                location: item.property_location,
              },
              user_vote: userVote ? userVote.vote : null,
            };
          })
        );

        return {
          ...wishlist,
          members: members.map(m => ({
            id: m.id,
            wishlist_id: m.wishlist_id,
            user_id: m.user_id,
            role: m.role,
            joined_at: m.joined_at,
            user: {
              id: m.user_id,
              name: m.user_name,
              email: m.user_email,
              avatar: m.user_avatar,
            },
          })),
          items: itemsWithVotes,
        };
      },
      300 // Cache por 5 minutos
    );
  } catch (error) {
    logger.error('Erro ao obter wishlist', { wishlistId, userId, error: error.message });
    throw error;
  }
}

/**
 * Listar wishlists do usuário
 */
async function getUserWishlists(userId) {
  try {
    const cacheKey = advancedCacheService.getCacheKey("user_wishlists", userId);
    
    return await advancedCacheService.cacheAside(
      cacheKey,
      async () => {
        const wishlists = await db("shared_wishlists")
          .select(
            "shared_wishlists.*",
            "wishlist_members.role"
          )
          .innerJoin("wishlist_members", "shared_wishlists.id", "wishlist_members.wishlist_id")
          .where("wishlist_members.user_id", userId)
          .orderBy("shared_wishlists.updated_at", "desc");

        // Buscar contagem de membros e itens para cada wishlist
        const wishlistsWithCounts = await Promise.all(
          wishlists.map(async (wishlist) => {
            const [membersCount] = await db("wishlist_members")
              .where("wishlist_id", wishlist.id)
              .count("* as count");

            const [itemsCount] = await db("wishlist_items")
              .where("wishlist_id", wishlist.id)
              .count("* as count");

            return {
              ...wishlist,
              members_count: parseInt(membersCount.count || 0),
              items_count: parseInt(itemsCount.count || 0),
            };
          })
        );

        return wishlistsWithCounts;
      },
      600 // Cache por 10 minutos
    );
  } catch (error) {
    logger.error('Erro ao listar wishlists do usuário', { userId, error: error.message });
    throw error;
  }
}

/**
 * Adicionar item à wishlist
 */
async function addItem(wishlistId, userId, propertyId, notes = null) {
  try {
    // Verificar acesso (membro ou admin)
    await checkWishlistAccess(wishlistId, userId, ['admin', 'member']);

    // Verificar se propriedade existe
    const property = await db("properties")
      .where("id", propertyId)
      .first();

    if (!property) {
      throw new Error("Propriedade não encontrada");
    }

    // Verificar se item já existe
    const existing = await db("wishlist_items")
      .where({
        wishlist_id: wishlistId,
        property_id: propertyId,
      })
      .first();

    if (existing) {
      throw new Error("Esta propriedade já está na wishlist");
    }

    return await withTransaction(async (trx) => {
      const [item] = await trx("wishlist_items").insert({
        wishlist_id: wishlistId,
        property_id: propertyId,
        added_by: userId,
        votes_up: 0,
        votes_down: 0,
        notes: notes || null,
        added_at: new Date(),
      }).returning("*");

      // Atualizar updated_at da wishlist
      await trx("shared_wishlists")
        .where("id", wishlistId)
        .update({
          updated_at: new Date(),
        });

      // Invalidar cache
      await advancedCacheService.invalidateCache(`wishlist:${wishlistId}*`);
      await advancedCacheService.invalidateCache(`user_wishlists:${userId}*`);

      logger.info('Item adicionado à wishlist', { itemId: item.id, wishlistId, propertyId });

      return item;
    });
  } catch (error) {
    logger.error('Erro ao adicionar item', { wishlistId, userId, propertyId, error: error.message });
    throw error;
  }
}

/**
 * Remover item da wishlist
 */
async function removeItem(wishlistId, itemId, userId) {
  try {
    // Verificar acesso
    await checkWishlistAccess(wishlistId, userId, ['admin', 'member']);

    return await withTransaction(async (trx) => {
      const item = await trx("wishlist_items")
        .where("id", itemId)
        .where("wishlist_id", wishlistId)
        .first();

      if (!item) {
        throw new Error("Item não encontrado");
      }

      // Verificar permissão (admin ou quem adicionou)
      const member = await trx("wishlist_members")
        .where("wishlist_id", wishlistId)
        .where("user_id", userId)
        .first();

      if (member.role !== 'admin' && item.added_by !== userId) {
        throw new Error("Você não tem permissão para remover este item");
      }

      // Remover votos do item
      await voteService.bulkRemoveVotes([itemId]);

      // Remover item
      await trx("wishlist_items")
        .where("id", itemId)
        .delete();

      // Atualizar updated_at da wishlist
      await trx("shared_wishlists")
        .where("id", wishlistId)
        .update({
          updated_at: new Date(),
        });

      // Invalidar cache
      await advancedCacheService.invalidateCache(`wishlist:${wishlistId}*`);
      await advancedCacheService.invalidateCache(`user_wishlists:${userId}*`);

      logger.info('Item removido da wishlist', { itemId, wishlistId });

      return { success: true };
    });
  } catch (error) {
    logger.error('Erro ao remover item', { wishlistId, itemId, userId, error: error.message });
    throw error;
  }
}

/**
 * Adicionar membro à wishlist
 */
async function addMember(wishlistId, userId, memberEmail, role = 'member') {
  try {
    // Verificar se quem está adicionando é admin
    await checkWishlistAccess(wishlistId, userId, ['admin']);

    return await withTransaction(async (trx) => {
      // Buscar usuário por email
      const user = await trx("users")
        .where("email", memberEmail.toLowerCase().trim())
        .first();

      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      // Verificar se já é membro
      const existing = await trx("wishlist_members")
        .where("wishlist_id", wishlistId)
        .where("user_id", user.id)
        .first();

      if (existing) {
        throw new Error("Usuário já é membro desta wishlist");
      }

      // Adicionar membro
      await trx("wishlist_members").insert({
        wishlist_id: wishlistId,
        user_id: user.id,
        role: role,
        joined_at: new Date(),
      });

      // Enviar notificação
      try {
        await notificationService.notifyWishlistInvitation(wishlistId, user.id);
      } catch (error) {
        logger.warn('Erro ao enviar notificação', { wishlistId, userId: user.id, error: error.message });
      }

      // Invalidar cache
      await advancedCacheService.invalidateCache(`wishlist:${wishlistId}*`);

      logger.info('Membro adicionado à wishlist', { wishlistId, memberId: user.id });

      return { success: true, user_id: user.id };
    });
  } catch (error) {
    logger.error('Erro ao adicionar membro', { wishlistId, userId, memberEmail, error: error.message });
    throw error;
  }
}

/**
 * Remover membro da wishlist
 */
async function removeMember(wishlistId, userId, memberIdToRemove) {
  try {
    // Verificar se quem está removendo é admin
    await checkWishlistAccess(wishlistId, userId, ['admin']);

    if (userId === memberIdToRemove) {
      throw new Error("Você não pode remover a si mesmo");
    }

    return await withTransaction(async (trx) => {
      const member = await trx("wishlist_members")
        .where("wishlist_id", wishlistId)
        .where("user_id", memberIdToRemove)
        .first();

      if (!member) {
        throw new Error("Membro não encontrado");
      }

      await trx("wishlist_members")
        .where("id", member.id)
        .delete();

      // Invalidar cache
      await advancedCacheService.invalidateCache(`wishlist:${wishlistId}*`);

      logger.info('Membro removido da wishlist', { wishlistId, memberId: memberIdToRemove });

      return { success: true };
    });
  } catch (error) {
    logger.error('Erro ao remover membro', { wishlistId, userId, memberIdToRemove, error: error.message });
    throw error;
  }
}

/**
 * Deletar wishlist
 */
async function deleteWishlist(wishlistId, userId) {
  try {
    // Verificar se é admin
    await checkWishlistAccess(wishlistId, userId, ['admin']);

    return await withTransaction(async (trx) => {
      // Buscar itens para remover votos
      const items = await trx("wishlist_items")
        .where("wishlist_id", wishlistId)
        .select("id");

      const itemIds = items.map(i => i.id);
      if (itemIds.length > 0) {
        await voteService.bulkRemoveVotes(itemIds);
      }

      // Remover membros
      await trx("wishlist_members")
        .where("wishlist_id", wishlistId)
        .delete();

      // Remover itens
      await trx("wishlist_items")
        .where("wishlist_id", wishlistId)
        .delete();

      // Remover wishlist
      await trx("shared_wishlists")
        .where("id", wishlistId)
        .delete();

      // Invalidar cache
      await advancedCacheService.invalidateCache(`wishlist:${wishlistId}*`);
      await advancedCacheService.invalidateCache(`user_wishlists:${userId}*`);

      logger.info('Wishlist deletada', { wishlistId, userId });

      return { success: true };
    });
  } catch (error) {
    logger.error('Erro ao deletar wishlist', { wishlistId, userId, error: error.message });
    throw error;
  }
}

/**
 * Verificar acesso à wishlist
 */
async function checkWishlistAccess(wishlistId, userId, allowedRoles = ['admin', 'member']) {
  const member = await db("wishlist_members")
    .where("wishlist_id", wishlistId)
    .where("user_id", userId)
    .first();

  if (!member) {
    throw new Error("Você não tem acesso a esta wishlist");
  }

  if (allowedRoles && !allowedRoles.includes(member.role)) {
    throw new Error("Você não tem permissão para esta ação");
  }

  return member;
}

module.exports = {
  createWishlist,
  getWishlist,
  getUserWishlists,
  addItem,
  removeItem,
  addMember,
  removeMember,
  deleteWishlist,
};

