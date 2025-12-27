/**
 * API Client para Leilões
 * FASE 1.3: Cliente HTTP para comunicação com backend
 */

import { Auction, Bid, CreateAuctionData, PaymentData, PaymentResult } from './types';
import type { AuctionFilters } from './types';

// Re-exportar tipos para facilitar importação
export type { AuctionFilters } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Obter token de autenticação do localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * Headers padrão para requisições autenticadas
 */
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

/**
 * Buscar leilões com filtros e paginação
 */
export async function getAuctions(filters?: AuctionFilters): Promise<{
  auctions: Auction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const params = new URLSearchParams();
  
  if (filters?.status) params.append('status', filters.status);
  if (filters?.city) params.append('city', filters.city);
  if (filters?.state) params.append('state', filters.state);
  if (filters?.min_price) params.append('min_price', filters.min_price.toString());
  if (filters?.max_price) params.append('max_price', filters.max_price.toString());
  if (filters?.check_in) params.append('check_in', filters.check_in);
  if (filters?.check_out) params.append('check_out', filters.check_out);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.sort_by) params.append('sort_by', filters.sort_by);
  if (filters?.sort_order) params.append('sort_order', filters.sort_order);

  try {
    const response = await fetch(`${API_BASE}/rsv360/auctions?${params}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erro ao buscar leilões' }));
      throw new Error(error.message || 'Erro ao buscar leilões');
    }

    const data = await response.json();
    return {
      auctions: data.auctions || [],
      pagination: data.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    };
  } catch (err) {
    // Se for erro de rede, retornar dados vazios ao invés de quebrar
    if (err instanceof TypeError && err.message.includes('fetch')) {
      console.warn('Backend não disponível, retornando dados vazios');
      return {
        auctions: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };
    }
    throw err;
  }
}

/**
 * Buscar leilão por ID
 */
export async function getAuctionById(id: string): Promise<Auction> {
  try {
    const response = await fetch(`${API_BASE}/rsv360/auctions/${id}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erro ao buscar leilão' }));
      throw new Error(error.message || 'Erro ao buscar leilão');
    }

    return response.json();
  } catch (err) {
    // Se for erro de rede, lançar erro específico
    if (err instanceof TypeError && err.message.includes('fetch')) {
      console.warn('Backend não disponível');
      throw new Error('Backend não disponível. Verifique se o servidor está rodando.');
    }
    throw err;
  }
}

/**
 * Buscar lances de um leilão
 */
export async function getAuctionBids(auctionId: string): Promise<Bid[]> {
  try {
    const response = await fetch(`${API_BASE}/rsv360/auctions/${auctionId}/bids`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erro ao buscar lances' }));
      throw new Error(error.message || 'Erro ao buscar lances');
    }

    const data = await response.json();
    return data || [];
  } catch (err) {
    // Se for erro de rede, retornar array vazio ao invés de quebrar
    if (err instanceof TypeError && err.message.includes('fetch')) {
      console.warn('Backend não disponível, retornando lances vazios');
      return [];
    }
    throw err;
  }
}

/**
 * Criar lance em um leilão
 */
export async function createBid(
  auctionId: string,
  amount: number,
  isAutoBid: boolean = false,
  maxAmount?: number
): Promise<Bid> {
  const response = await fetch(`${API_BASE}/rsv360/auctions/${auctionId}/bids`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      amount,
      is_auto_bid: isAutoBid,
      max_amount: maxAmount,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro ao criar lance' }));
    throw new Error(error.message || 'Erro ao criar lance');
  }

  return response.json();
}

/**
 * Criar novo leilão (host)
 */
export async function createAuction(data: CreateAuctionData): Promise<Auction> {
  const response = await fetch(`${API_BASE}/rsv360/auctions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro ao criar leilão' }));
    throw new Error(error.message || 'Erro ao criar leilão');
  }

  return response.json();
}

/**
 * Processar pagamento após vencer leilão
 */
export async function processPayment(
  auctionId: string,
  paymentData: PaymentData
): Promise<PaymentResult> {
  const response = await fetch(`${API_BASE}/rsv360/auctions/${auctionId}/payment`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(paymentData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro ao processar pagamento' }));
    throw new Error(error.message || 'Erro ao processar pagamento');
  }

  return response.json();
}

/**
 * Verificar se usuário é vencedor e precisa pagar
 */
export async function checkPaymentRequired(auctionId: string): Promise<{
  requires_payment: boolean;
  time_remaining?: number; // segundos restantes
  auction?: Auction;
}> {
  const response = await fetch(`${API_BASE}/rsv360/auctions/${auctionId}/payment-status`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro ao verificar pagamento' }));
    throw new Error(error.message || 'Erro ao verificar pagamento');
  }

  return response.json();
}

/**
 * Cancelar pagamento (desistir do leilão)
 */
export async function cancelPayment(auctionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/rsv360/auctions/${auctionId}/payment/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro ao cancelar pagamento' }));
    throw new Error(error.message || 'Erro ao cancelar pagamento');
  }
}

