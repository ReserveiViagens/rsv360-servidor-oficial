/**
 * Componente: BidHistory
 * FASE 1.7: Histórico de lances
 */

import React, { useEffect, useRef, memo } from 'react';
import Image from 'next/image';
import { Bid } from '@shared/api/auctions';

interface BidHistoryProps {
  bids: Bid[];
  currentUserId?: number | null;
  className?: string;
}

export const BidHistory = memo(function BidHistory({ bids, currentUserId, className = '' }: BidHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll automático para o último lance
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [bids]);

  if (bids.length === 0) {
    return (
      <div className={`bg-gray-50 p-6 rounded-lg text-center text-gray-500 ${className}`}>
        <p>Nenhum lance ainda</p>
        <p className="text-sm mt-1">Seja o primeiro a fazer um lance!</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`} role="region" aria-label="Histórico de lances">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-bold" id="bid-history-title">Histórico de Lances</h3>
        <p className="text-sm text-gray-600" aria-live="polite" aria-atomic="true">
          {bids.length} lance{bids.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div
        ref={scrollRef}
        className="max-h-96 overflow-y-auto"
        style={{ scrollBehavior: 'smooth' }}
        role="list"
        aria-labelledby="bid-history-title"
        tabIndex={0}
        aria-label="Lista de lances"
      >
        {bids.map((bid, index) => {
          const isCurrentUser = currentUserId === bid.user_id;
          const isTopBid = index === 0; // Primeiro da lista (maior lance)

          return (
            <div
              key={bid.id}
              role="listitem"
              className={`p-4 border-b border-gray-100 last:border-b-0 ${
                isCurrentUser ? 'bg-blue-50' : ''
              } ${isTopBid ? 'bg-green-50 border-green-200' : ''}`}
              aria-label={`Lance de ${bid.user.name}: R$ ${bid.amount.toLocaleString('pt-BR')}${isCurrentUser ? ' (seu lance)' : ''}${isTopBid ? ' (maior lance)' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                    isCurrentUser ? 'bg-blue-600' : 'bg-gray-400'
                  }`}>
                    {bid.user.avatar ? (
                      <Image
                        src={bid.user.avatar}
                        alt={`Avatar de ${bid.user.name}`}
                        width={40}
                        height={40}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span aria-hidden="true">{bid.user.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  {/* Informações */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold ${isCurrentUser ? 'text-blue-600' : 'text-gray-900'}`}>
                        {bid.user.name}
                        {isCurrentUser && ' (Você)'}
                      </p>
                      {isTopBid && (
                        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                          🏆 Maior Lance
                        </span>
                      )}
                      {bid.is_auto_bid && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                          🤖 Auto
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(bid.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Valor */}
                <div className="text-right">
                  <p className="text-xl font-bold text-green-600">
                    R$ {bid.amount.toLocaleString('pt-BR')}
                  </p>
                  {bid.is_auto_bid && bid.max_amount && (
                    <p className="text-xs text-gray-500">
                      Máx: R$ {bid.max_amount.toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

