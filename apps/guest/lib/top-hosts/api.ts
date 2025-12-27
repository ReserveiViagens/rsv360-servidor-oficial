/**
 * 🏆 Top Hosts API Client
 * FASE 4.2: Cliente API para Top Hosts
 */

import {
  HostLeaderboard,
  HostRating,
  HostBadge,
  HostProfile,
  AwardBadgeDTO,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const topHostsApi = {
  /**
   * Obter leaderboard de top hosts
   */
  async getLeaderboard(limit: number = 10): Promise<HostLeaderboard[]> {
    return request(`/api/rsv360/top-hosts/leaderboard?limit=${limit}`);
  },

  /**
   * Obter rating de um host
   */
  async getHostRating(hostId: number): Promise<HostRating> {
    return request(`/api/rsv360/top-hosts/${hostId}/rating`);
  },

  /**
   * Obter badges de um host
   */
  async getHostBadges(hostId: number): Promise<HostBadge[]> {
    return request(`/api/rsv360/top-hosts/${hostId}/badges`);
  },

  /**
   * Conceder badge a um host (apenas admin)
   */
  async awardBadge(hostId: number, data: AwardBadgeDTO): Promise<HostBadge> {
    return request(`/api/rsv360/top-hosts/${hostId}/badges`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

