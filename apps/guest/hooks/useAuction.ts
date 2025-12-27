/**
 * Hook: useAuction
 * FASE 2.4: Hook para gerenciar estado do leilão com atualização em tempo real
 */

import { useState, useEffect, useCallback } from 'react';
import { getAuctionById, getAuctionBids } from '@shared/api/auctions';
import { Auction, Bid } from '@shared/api/auctions';
import { useAuctionSocket } from './useAuctionSocket';

interface UseAuctionOptions {
  auctionId: string | undefined;
  autoRefresh?: boolean;
  refreshInterval?: number; // em milissegundos
}

export function useAuction({ auctionId, autoRefresh = true, refreshInterval = 5000 }: UseAuctionOptions) {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para carregar dados
  const loadData = useCallback(async () => {
    if (!auctionId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [auctionData, bidsData] = await Promise.all([
        getAuctionById(auctionId),
        getAuctionBids(auctionId),
      ]);
      setAuction(auctionData);
      setBids(bidsData || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar leilão';
      setError(errorMessage);
      // Não quebrar a página se o backend não estiver disponível
      setAuction(null);
      setBids([]);
      console.error('Erro ao carregar leilão:', err);
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh (polling como fallback)
  useEffect(() => {
    if (!autoRefresh || !auctionId || loading) return;

    const interval = setInterval(() => {
      loadData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, auctionId, loading, refreshInterval, loadData]);

  // WebSocket para atualização em tempo real
  const { connected: wsConnected } = useAuctionSocket({
    auctionId: auctionId || '',
    enabled: !!auctionId,
    onNewBid: (newBid) => {
      setBids((prev) => {
        // Adicionar novo lance no início (maior lance primeiro)
        const updated = [newBid, ...prev];
        // Remover duplicatas e ordenar por valor (maior primeiro)
        const unique = updated.filter(
          (bid, index, self) => index === self.findIndex((b) => b.id === bid.id)
        );
        return unique.sort((a, b) => b.amount - a.amount);
      });
      
      // Atualizar lance atual do leilão
      if (auction && newBid.amount > auction.current_bid) {
        setAuction((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            current_bid: newBid.amount,
            bids_count: prev.bids_count + 1,
          };
        });
      }
    },
    onAuctionUpdated: (updatedAuction) => {
      setAuction(updatedAuction);
    },
    onAuctionEnded: (endedAuction) => {
      setAuction(endedAuction);
    },
    onAuctionExtended: (newEndTime) => {
      setAuction((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          extended_time: newEndTime,
        };
      });
    },
  });

  // Funções auxiliares
  const isActive = auction?.status === 'active';
  const isEnded = auction?.status === 'ended';
  const isScheduled = auction?.status === 'scheduled';
  const isCancelled = auction?.status === 'cancelled';

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    auction,
    bids,
    loading,
    error,
    isActive,
    isEnded,
    isScheduled,
    isCancelled,
    wsConnected,
    refresh,
  };
}

