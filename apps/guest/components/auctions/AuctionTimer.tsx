/**
 * Componente: AuctionTimer
 * FASE 1.5: Timer regressivo com extensão automática
 */

import React, { useState, useEffect, memo } from 'react';

interface AuctionTimerProps {
  endTime: string;
  extendedTime?: string;
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  size?: 'small' | 'medium' | 'large';
  onTimeUpdate?: (timeRemaining: number) => void;
  onExpired?: () => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number; // em segundos
}

export const AuctionTimer = memo(function AuctionTimer({
  endTime,
  extendedTime,
  status,
  size = 'medium',
  onTimeUpdate,
  onExpired,
}: AuctionTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [wasExtended, setWasExtended] = useState(false);

  useEffect(() => {
    if (status !== 'active' && status !== 'scheduled') {
      setTimeRemaining(null);
      return;
    }

    const calculateTimeRemaining = (): TimeRemaining | null => {
      // Usar extendedTime se disponível, senão usar endTime
      const targetTime = extendedTime ? new Date(extendedTime) : new Date(endTime);
      const now = new Date();
      const diff = Math.max(0, Math.floor((targetTime.getTime() - now.getTime()) / 1000));

      if (diff === 0) {
        return null;
      }

      return {
        days: Math.floor(diff / 86400),
        hours: Math.floor((diff % 86400) / 3600),
        minutes: Math.floor((diff % 3600) / 60),
        seconds: diff % 60,
        total: diff,
      };
    };

    // Verificar se foi estendido
    if (extendedTime && extendedTime !== endTime) {
      setWasExtended(true);
    }

    const updateTimer = () => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining) {
        onTimeUpdate?.(remaining.total);
      } else {
        onExpired?.();
      }
    };

    // Atualizar imediatamente
    updateTimer();

    // Atualizar a cada segundo
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endTime, extendedTime, status, onTimeUpdate, onExpired]);

  if (status === 'ended' || status === 'cancelled') {
    return (
      <div className={`text-gray-500 ${size === 'small' ? 'text-sm' : size === 'large' ? 'text-xl' : 'text-base'}`}>
        {status === 'ended' ? 'Leilão Encerrado' : 'Leilão Cancelado'}
      </div>
    );
  }

  if (!timeRemaining) {
    return (
      <div className={`text-red-600 font-semibold ${size === 'small' ? 'text-sm' : size === 'large' ? 'text-xl' : 'text-base'}`}>
        Tempo Esgotado
      </div>
    );
  }

  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-xl',
  };

  const getColorClass = () => {
    const totalMinutes = timeRemaining.total / 60;
    if (totalMinutes < 15) return 'text-red-600';
    if (totalMinutes < 60) return 'text-orange-600';
    return 'text-green-600';
  };

  const timeString = timeRemaining.days > 0
    ? `${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m ${timeRemaining.seconds}s`
    : `${timeRemaining.hours}h ${timeRemaining.minutes}m ${timeRemaining.seconds}s`;

  return (
    <div 
      className={`${sizeClasses[size]} ${getColorClass()}`}
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Tempo restante: ${timeString}`}
    >
      <div className="flex items-center gap-2">
        <span className="font-bold" aria-hidden="true">⏰</span>
        <div className="flex items-center gap-1" aria-label={timeString}>
          {timeRemaining.days > 0 && (
            <>
              <span className="font-bold">{timeRemaining.days.toString().padStart(2, '0')}</span>
              <span className="text-gray-500">d</span>
            </>
          )}
          <span className="font-bold">{timeRemaining.hours.toString().padStart(2, '0')}</span>
          <span className="text-gray-500">h</span>
          <span className="font-bold">{timeRemaining.minutes.toString().padStart(2, '0')}</span>
          <span className="text-gray-500">m</span>
          <span className="font-bold">{timeRemaining.seconds.toString().padStart(2, '0')}</span>
          <span className="text-gray-500">s</span>
        </div>
        {wasExtended && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
            Estendido
          </span>
        )}
      </div>
      {timeRemaining.total < 900 && ( // Menos de 15 minutos
        <p className="text-xs text-red-600 mt-1">
          ⚠️ Leilão pode ser estendido se houver lance nos últimos 15 minutos
        </p>
      )}
    </div>
  );
});

