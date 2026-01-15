import { useState, useEffect, useCallback } from 'react';
import { systemHealthService } from '../services/systemhealthservice';
import { useAuth } from '../contexts/authcontext';
import type { HealthMetrics, AlertItem } from '../types/systemhealth';

interface UseSystemHealthOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

function getMockHealthMetrics(): HealthMetrics {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      connected: true,
      connectionCount: 5,
    },
    statistics: {
      totalOrganizations: 3,
      totalStores: 8,
      totalUsers: 15,
      activeUsers24h: 12,
    },
    performance: {
      avgResponseTime: 245,
      maxResponseTime: 850,
      totalRequests: 1543,
      errorRate: 1.2,
    },
    errors: {
      lastHour: 2,
      last24Hours: 8,
      critical24h: 0,
    },
    resources: {
      aiRequestsToday: 47,
      edgeFunctionsToday: 156,
    },
  };
}

function getMockAlerts(): AlertItem[] {
  return [
    {
      id: '1',
      severity: 'low',
      message: 'システムは正常に動作しています',
      timestamp: new Date().toISOString(),
      category: 'performance',
      resolved: false,
    },
  ];
}

export function useSystemHealth(options: UseSystemHealthOptions = {}) {
  const { autoRefresh = true, refreshInterval = 30000 } = options;
  const { isDemoMode, user } = useAuth();

  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchHealthMetrics = useCallback(async () => {
    try {
      setError(null);

      if (isDemoMode || !user?.isSuperAdmin) {
        setMetrics(getMockHealthMetrics());
        setLastUpdate(new Date());
        setLoading(false);
        return;
      }

      const data = await systemHealthService.getHealthMetrics();
      setMetrics(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching health metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch health metrics');
      setMetrics(getMockHealthMetrics());
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, user?.isSuperAdmin]);

  const fetchAlerts = useCallback(async () => {
    try {
      if (isDemoMode || !user?.isSuperAdmin) {
        setAlerts(getMockAlerts());
        return;
      }

      const data = await systemHealthService.getRecentAlerts(20);
      setAlerts(data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setAlerts(getMockAlerts());
    }
  }, [isDemoMode, user?.isSuperAdmin]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchHealthMetrics(),
      fetchAlerts(),
    ]);
  }, [fetchHealthMetrics, fetchAlerts]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchHealthMetrics();
      fetchAlerts();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchHealthMetrics, fetchAlerts]);

  return {
    metrics,
    alerts,
    loading,
    error,
    lastUpdate,
    refresh,
  };
}
