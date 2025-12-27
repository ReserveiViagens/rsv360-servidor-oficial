/**
 * 🏠 Properties API Client
 * FASE: Cliente HTTP para propriedades
 */

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
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Fazer requisição HTTP
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    // Se for erro de rede (backend não disponível), lançar erro mais amigável
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Backend não disponível. Verifique se o servidor está rodando na porta 5000.');
    }
    throw error;
  }
}

export interface Property {
  id: number;
  title: string;
  location: string;
  address_city: string;
  address_state: string;
  type: string;
  base_price: number;
  max_guests: number;
  bedrooms?: number;
  bathrooms?: number;
  images: string[];
}

export interface MyPropertiesResponse {
  success: boolean;
  properties: Property[];
}

/**
 * Listar propriedades do usuário autenticado
 */
export async function getMyProperties(): Promise<MyPropertiesResponse> {
  return request<MyPropertiesResponse>('/rsv360/properties/my');
}

