/**
 * 🎯 Auction Status Job
 * FASE: Job para gerenciar status de leilões automaticamente
 * Executa a cada minuto para:
 * - Ativar leilões agendados
 * - Finalizar leilões ativos
 * - Identificar vencedores
 * - Definir payment_deadline
 * - Verificar payment_deadline expirado
 */

// Imports ajustados para acessar API (caminho relativo ao monorepo)
// De apps/jobs/src/jobs/ para apps/jobs/src/config/
// Usar wrapper do database para resolver dependências corretamente
const { db } = require("../config/database-wrapper");

// Logger simples para evitar dependências complexas
const logger = {
  info: (...args) => console.log('[AUCTION-JOB]', ...args),
  error: (...args) => console.error('[AUCTION-JOB ERROR]', ...args),
  warn: (...args) => console.warn('[AUCTION-JOB WARN]', ...args),
};

// NotificationService - tentar importar, se falhar usar fallback
let notificationService;
try {
  notificationService = require("../../../api/src/services/notificationService");
} catch (error) {
  // Fallback simples para notificações
  notificationService = {
    createNotification: async (data) => {
      logger.info('📬 Notificação (fallback):', data.title, data.message);
      return { id: Date.now(), ...data };
    },
  };
}

/**
 * Atualizar status de leilões
 * Deve ser executado a cada minuto (via cron ou setInterval)
 */
async function updateAuctionStatuses() {
  try {
    const now = new Date();
    logger.info('Iniciando atualização de status de leilões', { timestamp: now.toISOString() });

    // 1. Ativar leilões agendados quando start_time chegar
    const activatedCount = await db("auctions")
      .where("status", "scheduled")
      .where("start_time", "<=", now)
      .update({
        status: "active",
        updated_at: now,
      });

    if (activatedCount > 0) {
      logger.info(`✅ ${activatedCount} leilão(ões) ativado(s)`);
    }

    // 2. Finalizar leilões ativos quando end_time chegar
    const endedAuctions = await db("auctions")
      .where("status", "active")
      .where("end_time", "<=", now)
      .select("*");

    for (const auction of endedAuctions) {
      try {
        // Identificar vencedor (maior lance)
        const winnerBid = await db("auction_bids")
          .where("auction_id", auction.id)
          .orderBy("amount", "desc")
          .first();

        if (winnerBid) {
          // Marcar lance vencedor
          await db("auction_bids")
            .where("auction_id", auction.id)
            .update({ is_winning_bid: false });

          await db("auction_bids")
            .where("id", winnerBid.id)
            .update({ is_winning_bid: true });

          // Atualizar leilão
          const paymentDeadline = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutos
          await db("auctions")
            .where("id", auction.id)
            .update({
              status: "ended",
              winner_id: winnerBid.user_id,
              payment_deadline: paymentDeadline,
              updated_at: now,
            });

          // Notificar vencedor
          await notificationService.createNotification({
            user_id: winnerBid.user_id,
            type: "success",
            title: "🎉 Você venceu o leilão!",
            message: `Parabéns! Você venceu o leilão #${auction.id}. Você tem 5 minutos para realizar o pagamento.`,
            link: `/leiloes/${auction.id}`,
            metadata: {
              auction_id: auction.id,
              amount: winnerBid.amount,
              payment_deadline: paymentDeadline.toISOString(),
            },
          });

          logger.info(`✅ Leilão #${auction.id} finalizado. Vencedor: user_id ${winnerBid.user_id}`);
        } else {
          // Sem lances, apenas finalizar
          await db("auctions")
            .where("id", auction.id)
            .update({
              status: "ended",
              updated_at: now,
            });

          logger.info(`✅ Leilão #${auction.id} finalizado sem vencedor`);
        }
      } catch (error) {
        logger.error(`Erro ao finalizar leilão #${auction.id}`, { error: error.message });
      }
    }

    // 3. Verificar payment_deadline expirado e cancelar se não pagou
    const expiredAuctions = await db("auctions")
      .where("status", "ended")
      .where("payment_completed", false)
      .where("payment_deadline", "<=", now)
      .whereNotNull("winner_id")
      .select("*");

    for (const auction of expiredAuctions) {
      try {
        // Buscar segundo maior lance
        const secondBid = await db("auction_bids")
          .where("auction_id", auction.id)
          .where("user_id", "!=", auction.winner_id)
          .orderBy("amount", "desc")
          .first();

        if (secondBid) {
          // Promover segundo colocado
          await db("auction_bids")
            .where("auction_id", auction.id)
            .update({ is_winning_bid: false });

          await db("auction_bids")
            .where("id", secondBid.id)
            .update({ is_winning_bid: true });

          const newPaymentDeadline = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutos

          await db("auctions")
            .where("id", auction.id)
            .update({
              winner_id: secondBid.user_id,
              current_bid: secondBid.amount,
              payment_deadline: newPaymentDeadline,
              updated_at: now,
            });

          // Notificar novo vencedor
          await notificationService.createNotification({
            user_id: secondBid.user_id,
            type: "info",
            title: "🎉 Você é o novo vencedor!",
            message: `O vencedor anterior não pagou. Você é o novo vencedor do leilão #${auction.id}. Você tem 5 minutos para realizar o pagamento.`,
            link: `/leiloes/${auction.id}`,
            metadata: {
              auction_id: auction.id,
              amount: secondBid.amount,
              payment_deadline: newPaymentDeadline.toISOString(),
            },
          });

          logger.info(`✅ Leilão #${auction.id}: Novo vencedor promovido (user_id ${secondBid.user_id})`);
        } else {
          // Não há segundo lance, cancelar leilão
          await db("auctions")
            .where("id", auction.id)
            .update({
              status: "cancelled",
              winner_id: null,
              payment_deadline: null,
              updated_at: now,
            });

          logger.info(`✅ Leilão #${auction.id} cancelado (sem segundo lance)`);
        }
      } catch (error) {
        logger.error(`Erro ao processar leilão expirado #${auction.id}`, { error: error.message });
      }
    }

    logger.info('✅ Atualização de status de leilões concluída', {
      activated: activatedCount,
      ended: endedAuctions.length,
      expired: expiredAuctions.length,
    });
  } catch (error) {
    logger.error('Erro ao atualizar status de leilões', { error: error.message });
    throw error;
  }
}

/**
 * Iniciar job de atualização de status
 * Executa a cada minuto
 */
function startAuctionStatusJob() {
  // Executar imediatamente
  updateAuctionStatuses().catch((error) => {
    logger.error('Erro na primeira execução do job', { error: error.message });
  });

  // Executar a cada minuto
  const interval = setInterval(() => {
    updateAuctionStatuses().catch((error) => {
      logger.error('Erro na execução do job', { error: error.message });
    });
  }, 60 * 1000); // 60 segundos

  logger.info('✅ Job de atualização de status de leilões iniciado (executa a cada 1 minuto)');

  // Retornar função para parar o job
  return () => {
    clearInterval(interval);
    logger.info('⏹️ Job de atualização de status de leilões parado');
  };
}

module.exports = {
  updateAuctionStatuses,
  startAuctionStatusJob,
};

