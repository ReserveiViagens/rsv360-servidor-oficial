/**
 * 🏆 useTopHosts Hook
 * FASE 4.3: Hook para gerenciar Top Hosts
 */

import { useState, useEffect, useCallback } from 'react';
import { topHostsApi } from '../lib/top-hosts/api';
import { HostLeaderboard } from '../lib/top-hosts/types';

interface UseTopHostsReturn {
  leaderboard: HostLeaderboard[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTopHosts(limit: number = 10): UseTopHostsReturn {
  const [leaderboard, setLeaderboard] = useState<HostLeaderboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await topHostsApi.getLeaderboard(limit);
      setLeaderboard(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar leaderboard';
      setError(errorMessage);
      console.error('Erro ao carregar leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return {
    leaderboard,
    loading,
    error,
    refresh: loadLeaderboard,
  };
}

