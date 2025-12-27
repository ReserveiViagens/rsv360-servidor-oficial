/**
 * Componente: AuctionStatus
 * FASE 1.8: Badge de status do leilão
 */

import React, { memo } from 'react';

interface AuctionStatusProps {
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  winnerName?: string;
  className?: string;
}

export const AuctionStatus = memo(function AuctionStatus({ status, winnerName, className = '' }: AuctionStatusProps) {
  const statusConfig = {
    scheduled: {
      label: 'Agendado',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      icon: '📅',
    },
    active: {
      label: 'Ativo',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      icon: '🔥',
    },
    ended: {
      label: 'Encerrado',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      icon: '✅',
    },
    cancelled: {
      label: 'Cancelado',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      icon: '❌',
    },
  };

  const config = statusConfig[status];

  return (
    <div 
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.bgColor} ${config.textColor} ${className}`}
      role="status"
      aria-label={`Status do leilão: ${config.label}${status === 'ended' && winnerName ? `. Vencedor: ${winnerName}` : ''}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      <span>{config.label}</span>
      {status === 'ended' && winnerName && (
        <span className="ml-1 text-xs" aria-label={`Vencedor: ${winnerName}`}>
          • Vencedor: {winnerName}
        </span>
      )}
    </div>
  );
});

