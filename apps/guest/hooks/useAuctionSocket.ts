/**
 * Hook: useAuctionSocket
 * FASE 2.3: Hook para gerenciar conexão WebSocket de um leilão específico
 */

import { useEffect, useRef, useState } from 'react';
import { getSocket, on, off, isConnected } from '../lib/websocket';
import { Bid, Auction } from '@shared/api/auctions';

interface UseAuctionSocketOptions {
  auctionId: string;
  onNewBid?: (bid: Bid) => void;
  onAuctionUpdated?: (auction: Auction) => void;
  onAuctionEnded?: (auction: Auction) => void;
  onAuctionExtended?: (newEndTime: string) => void;
  onPaymentRequired?: (timeRemaining: number) => void;
  enabled?: boolean;
}

export function useAuctionSocket({
  auctionId,
  onNewBid,
  onAuctionUpdated,
  onAuctionEnded,
  onAuctionExtended,
  onPaymentRequired,
  enabled = true,
}: UseAuctionSocketOptions) {
  const [connected, setConnected] = useState(false);
  const callbacksRef = useRef({
    onNewBid,
    onAuctionUpdated,
    onAuctionEnded,
    onAuctionExtended,
    onPaymentRequired,
  });

  // Atualizar callbacks quando mudarem
  useEffect(() => {
    callbacksRef.current = {
      onNewBid,
      onAuctionUpdated,
      onAuctionEnded,
      onAuctionExtended,
      onPaymentRequired,
    };
  }, [onNewBid, onAuctionUpdated, onAuctionEnded, onAuctionExtended, onPaymentRequired]);

  useEffect(() => {
    if (!enabled || !auctionId) {
      return;
    }

    const socket = getSocket();
    if (!socket) {
      return;
    }

    // Verificar conexão
    setConnected(socket.connected);

    // Entrar na sala do leilão
    socket.emit('join_auction', { auctionId });

    // Handlers de eventos
    const handleNewBid = (bid: Bid) => {
      if (bid.auction_id === auctionId) {
        callbacksRef.current.onNewBid?.(bid);
      }
    };

    const handleAuctionUpdated = (auction: Auction) => {
      if (auction.id === auctionId) {
        callbacksRef.current.onAuctionUpdated?.(auction);
      }
    };

    const handleAuctionEnded = (auction: Auction) => {
      if (auction.id === auctionId) {
        callbacksRef.current.onAuctionEnded?.(auction);
      }
    };

    const handleAuctionExtended = (data: { auctionId: string; newEndTime: string }) => {
      if (data.auctionId === auctionId) {
        callbacksRef.current.onAuctionExtended?.(data.newEndTime);
      }
    };

    const handlePaymentRequired = (data: { auctionId: string; timeRemaining: number }) => {
      if (data.auctionId === auctionId) {
        callbacksRef.current.onPaymentRequired?.(data.timeRemaining);
      }
    };

    const handleConnect = () => {
      setConnected(true);
      socket.emit('join_auction', { auctionId });
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    // Registrar listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('new_bid', handleNewBid);
    socket.on('auction_updated', handleAuctionUpdated);
    socket.on('auction_ended', handleAuctionEnded);
    socket.on('auction_extended', handleAuctionExtended);
    socket.on('payment_required', handlePaymentRequired);

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('new_bid', handleNewBid);
      socket.off('auction_updated', handleAuctionUpdated);
      socket.off('auction_ended', handleAuctionEnded);
      socket.off('auction_extended', handleAuctionExtended);
      socket.off('payment_required', handlePaymentRequired);
      socket.emit('leave_auction', { auctionId });
    };
  }, [auctionId, enabled]);

  return {
    connected,
    isConnected: connected,
  };
}

