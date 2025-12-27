/**
 * Cliente WebSocket
 * FASE 2.2: Cliente Socket.io para comunicação em tempo real
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

/**
 * Obter token de autenticação
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * Conectar ao servidor WebSocket
 */
export function connectSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  const token = getAuthToken();

  socket = io(SOCKET_URL, {
    auth: {
      token: token || undefined,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  // Eventos de conexão
  socket.on('connect', () => {
    console.log('✅ WebSocket conectado');
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ WebSocket desconectado:', reason);
  });

  socket.on('connect_error', (error) => {
    // Silenciar erro se backend não estiver disponível (comum em desenvolvimento)
    const errorMessage = error.message || '';
    if (
      errorMessage.includes('ECONNREFUSED') || 
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('websocket error') ||
      errorMessage.includes('TransportError')
    ) {
      // Não mostrar erro no console - backend pode não estar rodando
      // console.warn('⚠️ WebSocket: Backend não disponível');
    } else {
      console.error('❌ Erro ao conectar WebSocket:', error);
    }
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`🔄 WebSocket reconectado após ${attemptNumber} tentativas`);
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`🔄 Tentativa de reconexão ${attemptNumber}...`);
  });

  socket.on('reconnect_failed', () => {
    console.error('❌ Falha ao reconectar WebSocket');
  });

  return socket;
}

/**
 * Desconectar do servidor WebSocket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Obter instância do socket (conecta se necessário)
 */
export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  
  try {
    if (!socket || !socket.connected) {
      connectSocket();
    }
    return socket;
  } catch (error) {
    console.error('Erro ao obter socket:', error);
    return null;
  }
}

/**
 * Verificar se está conectado
 */
export function isConnected(): boolean {
  return socket?.connected || false;
}

/**
 * Emitir evento
 */
export function emit(event: string, data: any): void {
  const sock = getSocket();
  if (sock) {
    sock.emit(event, data);
  }
}

/**
 * Escutar evento
 */
export function on(event: string, callback: (...args: any[]) => void): void {
  const sock = getSocket();
  if (sock) {
    sock.on(event, callback);
  }
}

/**
 * Parar de escutar evento
 */
export function off(event: string, callback?: (...args: any[]) => void): void {
  const sock = getSocket();
  if (sock) {
    sock.off(event, callback);
  }
}

/**
 * Escutar evento uma vez
 */
export function once(event: string, callback: (...args: any[]) => void): void {
  const sock = getSocket();
  if (sock) {
    sock.once(event, callback);
  }
}

