/**
 * 🎯 Auction Service
 * FASE: Serviço para gerenciar leilões de hospedagem
 */

const { db } = require("../config/database");
const { createLogger } = require("../utils/logger");
const notificationService = require("./notificationService");

const logger = createLogger({ service: 'auctionService' });

/**
 * Listar leilões com filtros
 */
async function getAuctions(filters = {}) {
  try {
    let query = db("auctions")
      .leftJoin("properties", "auctions.property_id", "properties.id")
      .leftJoin("users as hosts", "auctions.host_id", "hosts.id")
      .leftJoin("users as winners", "auctions.winner_id", "winners.id")
      .select(
        "auctions.*",
        "properties.title as property_title",
        "properties.address_city as property_city",
        "properties.address_state as property_state",
        "properties.photos as property_photos",
        "properties.amenities as property_amenities",
        "properties.bedrooms",
        "properties.bathrooms",
        "properties.max_guests as property_max_guests",
        "hosts.full_name as host_name",
        "winners.full_name as winner_name",
        "winners.email as winner_email"
      );

    // Aplicar filtros
    if (filters.status) {
      query = query.where("auctions.status", filters.status);
    }
    if (filters.city) {
      query = query.where("properties.address_city", "ilike", `%${filters.city}%`);
    }
    if (filters.state) {
      query = query.where("properties.address_state", filters.state);
    }
    if (filters.min_price) {
      query = query.where("auctions.current_bid", ">=", filters.min_price);
    }
    if (filters.max_price) {
      query = query.where("auctions.current_bid", "<=", filters.max_price);
    }
    if (filters.check_in) {
      query = query.where("auctions.check_in", ">=", filters.check_in);
    }
    if (filters.check_out) {
      query = query.where("auctions.check_out", "<=", filters.check_out);
    }

    // Paginação
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    // Contar total
    const countQuery = query.clone().count("* as total").first();
    const total = parseInt((await countQuery).total || 0);

    // Ordenação
    if (filters.sort_by) {
      const sortOrder = filters.sort_order || "asc";
      switch (filters.sort_by) {
        case "price":
          query = query.orderBy("auctions.current_bid", sortOrder);
          break;
        case "time":
          query = query.orderBy("auctions.end_time", sortOrder);
          break;
        case "popularity":
          query = query.orderBy("auctions.bids_count", "desc");
          break;
        default:
          query = query.orderBy("auctions.created_at", "desc");
      }
    } else {
      query = query.orderBy("auctions.created_at", "desc");
    }

    const auctions = await query.limit(limit).offset(offset);

    // Formatar resultados
    const formattedAuctions = auctions.map((auction) => {
      const photos = auction.property_photos
        ? typeof auction.property_photos === "string"
          ? JSON.parse(auction.property_photos)
          : auction.property_photos
        : [];
      const amenities = auction.property_amenities
        ? typeof auction.property_amenities === "string"
          ? JSON.parse(auction.property_amenities)
          : auction.property_amenities
        : [];

      return {
        id: auction.id.toString(),
        property_id: auction.property_id,
        property: {
          id: auction.property_id,
          title: auction.property_title,
          location: `${auction.property_city}, ${auction.property_state}`,
          city: auction.property_city,
          state: auction.property_state,
          images: photos,
          amenities: amenities,
          bedrooms: auction.bedrooms,
          bathrooms: auction.bathrooms,
          max_guests: auction.property_max_guests,
        },
        start_price: parseFloat(auction.start_price),
        current_bid: parseFloat(auction.current_bid),
        min_increment: parseFloat(auction.min_increment),
        start_time: auction.start_time.toISOString(),
        end_time: auction.end_time.toISOString(),
        extended_time: auction.extended_time
          ? auction.extended_time.toISOString()
          : null,
        status: auction.status,
        winner_id: auction.winner_id,
        winner: auction.winner_id
          ? {
              id: auction.winner_id,
              name: auction.winner_name,
              email: auction.winner_email,
            }
          : null,
        bids_count: auction.bids_count,
        participants_count: auction.participants_count,
        check_in: auction.check_in.toISOString().split("T")[0],
        check_out: auction.check_out.toISOString().split("T")[0],
        max_guests: auction.max_guests,
        description: auction.description,
        created_at: auction.created_at.toISOString(),
        updated_at: auction.updated_at.toISOString(),
      };
    });

    return {
      auctions: formattedAuctions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Erro ao buscar leilões", { error: error.message });
    throw error;
  }
}

/**
 * Obter leilão por ID
 */
async function getAuctionById(auctionId, userId = null) {
  try {
    const auction = await db("auctions")
      .leftJoin("properties", "auctions.property_id", "properties.id")
      .leftJoin("users as hosts", "auctions.host_id", "hosts.id")
      .leftJoin("users as winners", "auctions.winner_id", "winners.id")
      .select(
        "auctions.*",
        "properties.title as property_title",
        "properties.address_city as property_city",
        "properties.address_state as property_state",
        "properties.photos as property_photos",
        "properties.amenities as property_amenities",
        "properties.bedrooms",
        "properties.bathrooms",
        "properties.max_guests as property_max_guests",
        "hosts.full_name as host_name",
        "winners.full_name as winner_name",
        "winners.email as winner_email"
      )
      .where("auctions.id", auctionId)
      .first();

    if (!auction) {
      return null;
    }

    const photos = auction.property_photos
      ? typeof auction.property_photos === "string"
        ? JSON.parse(auction.property_photos)
        : auction.property_photos
      : [];
    const amenities = auction.property_amenities
      ? typeof auction.property_amenities === "string"
        ? JSON.parse(auction.property_amenities)
        : auction.property_amenities
      : [];

    return {
      id: auction.id.toString(),
      property_id: auction.property_id,
      property: {
        id: auction.property_id,
        title: auction.property_title,
        location: `${auction.property_city}, ${auction.property_state}`,
        city: auction.property_city,
        state: auction.property_state,
        images: photos,
        amenities: amenities,
        bedrooms: auction.bedrooms,
        bathrooms: auction.bathrooms,
        max_guests: auction.property_max_guests,
      },
      start_price: parseFloat(auction.start_price),
      current_bid: parseFloat(auction.current_bid),
      min_increment: parseFloat(auction.min_increment),
      start_time: auction.start_time.toISOString(),
      end_time: auction.end_time.toISOString(),
      extended_time: auction.extended_time
        ? auction.extended_time.toISOString()
        : null,
      status: auction.status,
      winner_id: auction.winner_id,
      winner: auction.winner_id
        ? {
            id: auction.winner_id,
            name: auction.winner_name,
            email: auction.winner_email,
          }
        : null,
      bids_count: auction.bids_count,
      participants_count: auction.participants_count,
      check_in: auction.check_in.toISOString().split("T")[0],
      check_out: auction.check_out.toISOString().split("T")[0],
      max_guests: auction.max_guests,
      description: auction.description,
      payment_completed: auction.payment_completed,
      payment_deadline: auction.payment_deadline
        ? auction.payment_deadline.toISOString()
        : null,
      created_at: auction.created_at.toISOString(),
      updated_at: auction.updated_at.toISOString(),
    };
  } catch (error) {
    logger.error("Erro ao buscar leilão", { auctionId, error: error.message });
    throw error;
  }
}

/**
 * Criar novo leilão
 */
async function createAuction(hostId, auctionData) {
  try {
    const [auction] = await db("auctions")
      .insert({
        property_id: auctionData.property_id,
        host_id: hostId,
        start_price: auctionData.start_price,
        current_bid: auctionData.start_price,
        min_increment: auctionData.min_increment || 10.0,
        start_time: new Date(auctionData.start_time),
        end_time: new Date(auctionData.end_time),
        check_in: new Date(auctionData.check_in),
        check_out: new Date(auctionData.check_out),
        max_guests: auctionData.max_guests,
        description: auctionData.description || null,
        status: "scheduled",
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning("*");

    return await getAuctionById(auction.id);
  } catch (error) {
    logger.error("Erro ao criar leilão", { hostId, error: error.message });
    throw error;
  }
}

/**
 * Obter lances de um leilão
 */
async function getAuctionBids(auctionId) {
  try {
    const bids = await db("auction_bids")
      .leftJoin("users", "auction_bids.user_id", "users.id")
      .select(
        "auction_bids.*",
        "users.full_name as user_name",
        "users.email as user_email"
      )
      .where("auction_bids.auction_id", auctionId)
      .orderBy("auction_bids.created_at", "desc");

    return bids.map((bid) => ({
      id: bid.id.toString(),
      auction_id: bid.auction_id.toString(),
      user_id: bid.user_id,
      user: {
        id: bid.user_id,
        name: bid.user_name,
        avatar: null, // Pode ser adicionado depois
      },
      amount: parseFloat(bid.amount),
      is_auto_bid: bid.is_auto_bid,
      max_amount: bid.max_amount ? parseFloat(bid.max_amount) : null,
      created_at: bid.created_at.toISOString(),
    }));
  } catch (error) {
    logger.error("Erro ao buscar lances", { auctionId, error: error.message });
    throw error;
  }
}

/**
 * Criar lance em um leilão
 */
async function createBid(auctionId, userId, bidData) {
  try {
    // Verificar se o leilão existe e está ativo
    const auction = await db("auctions").where("id", auctionId).first();
    if (!auction) {
      throw new Error("Leilão não encontrado");
    }
    if (auction.status !== "active") {
      throw new Error("Leilão não está ativo");
    }

    // Verificar se o lance é válido
    const minBid = auction.current_bid + auction.min_increment;
    if (bidData.amount < minBid) {
      throw new Error(
        `Lance mínimo é R$ ${minBid.toFixed(2)} (lance atual + incremento mínimo)`
      );
    }

    // Criar lance
    const [bid] = await db("auction_bids")
      .insert({
        auction_id: auctionId,
        user_id: userId,
        amount: bidData.amount,
        is_auto_bid: bidData.is_auto_bid || false,
        max_amount: bidData.max_amount || null,
        is_winning_bid: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning("*");

    // Atualizar lance anterior para não ser vencedor
    await db("auction_bids")
      .where("auction_id", auctionId)
      .where("id", "!=", bid.id)
      .update({ is_winning_bid: false });

    // Atualizar leilão
    await db("auctions")
      .where("id", auctionId)
      .update({
        current_bid: bidData.amount,
        bids_count: db.raw("bids_count + 1"),
        updated_at: new Date(),
      });

    // Atualizar ou criar participante
    await db("auction_participants")
      .insert({
        auction_id: auctionId,
        user_id: userId,
        bids_count: 1,
        total_bid_amount: bidData.amount,
        first_bid_at: new Date(),
        last_bid_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflict(["auction_id", "user_id"])
      .merge({
        bids_count: db.raw("bids_count + 1"),
        total_bid_amount: db.raw("total_bid_amount + ?", [bidData.amount]),
        last_bid_at: new Date(),
        updated_at: new Date(),
      });

    // Atualizar contagem de participantes
    const participantsCount = await db("auction_participants")
      .where("auction_id", auctionId)
      .count("* as count")
      .first();
    await db("auctions")
      .where("id", auctionId)
      .update({
        participants_count: parseInt(participantsCount.count || 0),
      });

    // Notificar outros participantes
    const participants = await db("auction_participants")
      .where("auction_id", auctionId)
      .where("user_id", "!=", userId)
      .select("user_id");

    for (const participant of participants) {
      await notificationService.createNotification({
        user_id: participant.user_id,
        type: "info",
        title: "Novo lance no leilão",
        message: `Alguém fez um lance de R$ ${bidData.amount.toFixed(2)}`,
        link: `/leiloes/${auctionId}`,
        metadata: { auction_id: auctionId },
      });
    }

    return await getAuctionBids(auctionId);
  } catch (error) {
    logger.error("Erro ao criar lance", {
      auctionId,
      userId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Verificar status de pagamento
 */
async function checkPaymentStatus(auctionId, userId) {
  try {
    const auction = await db("auctions").where("id", auctionId).first();
    if (!auction) {
      throw new Error("Leilão não encontrado");
    }

    const isWinner = auction.winner_id === userId;
    const requiresPayment =
      isWinner && auction.status === "ended" && !auction.payment_completed;

    let timeRemaining = null;
    if (requiresPayment && auction.payment_deadline) {
      const deadline = new Date(auction.payment_deadline);
      const now = new Date();
      timeRemaining = Math.max(0, Math.floor((deadline - now) / 1000));
    }

    return {
      requires_payment: requiresPayment,
      time_remaining: timeRemaining,
      auction: requiresPayment ? await getAuctionById(auctionId) : null,
    };
  } catch (error) {
    logger.error("Erro ao verificar status de pagamento", {
      auctionId,
      userId,
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  getAuctions,
  getAuctionById,
  createAuction,
  getAuctionBids,
  createBid,
  checkPaymentStatus,
};

