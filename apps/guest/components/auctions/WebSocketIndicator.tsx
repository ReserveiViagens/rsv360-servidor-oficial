/**
 * Componente: WebSocketIndicator
 * FASE 2: Indicador visual de conexão WebSocket
 */

import React from 'react';

interface WebSocketIndicatorProps {
  connected: boolean;
  className?: string;
}

export function WebSocketIndicator({ connected, className = '' }: WebSocketIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {connected ? (
        <>
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-green-600">Tempo Real Ativo</span>
        </>
      ) : (
        <>
          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
          <span className="text-gray-500">Conectando...</span>
        </>
      )}
    </div>
  );
}

