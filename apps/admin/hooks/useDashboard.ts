/**
 * 📊 useDashboard Hook
 * FASE: Hook para gerenciar estatísticas do dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getDashboardStats,
  getRecentBookings,
  DashboardStats,
  RecentBooking,
} from '@/lib/dashboard/api';

interface UseDashboardReturn {
  stats: DashboardStats | null;
  recentBookings: RecentBooking[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboard(options: { autoRefresh?: boolean; refreshInterval?: number } = {}): UseDashboardReturn {
  const { autoRefresh = false, refreshInterval = 60000 } = options;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carregar dados do dashboard
   */
  const loadData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      const [statsResponse, bookingsResponse] = await Promise.all([
        getDashboardStats(),
        getRecentBookings(10),
      ]);

      setStats(statsResponse.stats);
      setRecentBookings(bookingsResponse.bookings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados do dashboard';
      setError(errorMessage);
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh manual
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    await loadData();
  }, [loadData]);

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadData]);

  return {
    stats,
    recentBookings,
    loading,
    error,
    refresh,
  };
}

