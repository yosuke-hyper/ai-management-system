import { useState, useEffect, useCallback } from 'react';
import { systemHealthService } from '../services/systemhealthservice';
import { useAuth } from '../contexts/authcontext';
import type { PerformanceTrendPoint } from '../types/systemhealth';

interface UsePerformanceMetricsOptions {
  hours?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

function getMockPerformanceTrends(): PerformanceTrendPoint[] {
  const trends: PerformanceTrendPoint[] = [];
  const now = Date.now();

  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now - i * 60 * 60 * 1000).toISOString();
    trends.push({
      timestamp,
      avgResponseTime: 200 + Math.random() * 100,
      requestCount: Math.floor(50 + Math.random() * 100),
      errorRate: Math.random() * 2,
    });
  }

  return trends;
}

export function usePerformanceMetrics(options: UsePerformanceMetricsOptions = {}) {
  const { hours = 24, autoRefresh = true, refreshInterval = 60000 } = options;
  const { isDemoMode, user } = useAuth();

  const [trends, setTrends] = useState<PerformanceTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    try {
      setError(null);

      if (isDemoMode || !user?.isSuperAdmin) {
        setTrends(getMockPerformanceTrends());
        setLoading(false);
        return;
      }

      const data = await systemHealthService.getPerformanceTrends(hours);
      setTrends(data);
    } catch (err) {
      console.error('Error fetching performance trends:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch performance trends');
      setTrends(getMockPerformanceTrends());
    } finally {
      setLoading(false);
    }
  }, [hours, isDemoMode, user?.isSuperAdmin]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchTrends();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchTrends]);

  return {
    trends,
    loading,
    error,
    refresh: fetchTrends,
  };
}
