/**
 * Hook: useAuctionsList
 * FASE 2: Hook para listagem de leilões com atualização em tempo real
 */

import { useState, useEffect, useCallback } from 'react';
import { getAuctions, AuctionFilters } from '@shared/api/auctions';
import { Auction } from '@shared/api/auctions';
import { getSocket, on, off } from '../lib/websocket';

interface UseAuctionsListOptions {
  filters?: AuctionFilters;
  autoRefresh?: boolean;
  refreshInterval?: number; // em milissegundos
}

export function useAuctionsList({
  filters,
  autoRefresh = true,
  refreshInterval = 30000, // 30 segundos como fallback
}: UseAuctionsListOptions = {}) {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [wsConnected, setWsConnected] = useState(false);

  // Função para carregar leilões
  const loadAuctions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAuctions(filters);
      setAuctions(result.auctions || []);
      setPagination(result.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar leilões';
      setError(errorMessage);
      // Não quebrar a página se o backend não estiver disponível
      setAuctions([]);
      setPagination({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
      console.error('Erro ao carregar leilões:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Carregar dados iniciais
  useEffect(() => {
    loadAuctions();
  }, [loadAuctions]);

  // Auto-refresh (polling como fallback)
  useEffect(() => {
    if (!autoRefresh || loading) return;

    const interval = setInterval(() => {
      if (!wsConnected) {
        // Só fazer polling se WebSocket não estiver conectado
        loadAuctions();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, loading, refreshInterval, loadAuctions, wsConnected]);

  // WebSocket para atualizações em tempo real
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let socket: any = null;
    try {
      socket = getSocket();
      if (!socket) {
        setWsConnected(false);
        return;
      }

      setWsConnected(socket.connected || false);

      const handleConnect = () => {
        setWsConnected(true);
      };

      const handleDisconnect = () => {
        setWsConnected(false);
      };

      // Escutar atualizações de leilões
      const handleAuctionUpdated = (updatedAuction: Auction) => {
        setAuctions((prev) => {
          const index = prev.findIndex((a) => a.id === updatedAuction.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = updatedAuction;
            return updated;
          }
          return prev;
        });
      };

      const handleNewBid = (data: { auctionId: string; bid: any }) => {
        setAuctions((prev) => {
          return prev.map((auction) => {
            if (auction.id === data.auctionId) {
              return {
                ...auction,
                current_bid: Math.max(auction.current_bid, data.bid.amount),
                bids_count: auction.bids_count + 1,
              };
            }
            return auction;
          });
        });
      };

      const handleAuctionEnded = (endedAuction: Auction) => {
        setAuctions((prev) => {
          return prev.map((auction) => {
            if (auction.id === endedAuction.id) {
              return endedAuction;
            }
            return auction;
          });
        });
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('auction_updated', handleAuctionUpdated);
      socket.on('new_bid', handleNewBid);
      socket.on('auction_ended', handleAuctionEnded);

      return () => {
        if (socket) {
          try {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('auction_updated', handleAuctionUpdated);
            socket.off('new_bid', handleNewBid);
            socket.off('auction_ended', handleAuctionEnded);
          } catch (err) {
            console.error('Erro ao limpar listeners do socket:', err);
          }
        }
      };
    } catch (err) {
      console.error('Erro ao configurar WebSocket:', err);
      setWsConnected(false);
      return () => {}; // Retornar função vazia para cleanup
    }
  }, []);

  const refresh = useCallback(() => {
    loadAuctions();
  }, [loadAuctions]);

  return {
    auctions,
    loading,
    error,
    pagination,
    wsConnected,
    refresh,
  };
}

