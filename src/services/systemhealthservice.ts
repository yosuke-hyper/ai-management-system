import { supabase } from '../lib/supabase';
import type { HealthMetrics, AlertItem, PerformanceTrendPoint } from '../types/systemhealth';

const HEALTH_CHECK_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-check`;

export const systemHealthService = {
  async getHealthMetrics(): Promise<HealthMetrics> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(HEALTH_CHECK_ENDPOINT, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch health metrics');
      }

      const data = await response.json();
      return data as HealthMetrics;
    } catch (error) {
      console.error('Error fetching health metrics:', error);
      throw error;
    }
  },

  async getRecentHealthHistory(hours: number = 24): Promise<HealthMetrics[]> {
    try {
      const { data, error } = await supabase
        .from('system_health_metrics')
        .select('*')
        .gte('recorded_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(metric => ({
        status: metric.overall_status as 'healthy' | 'warning' | 'critical',
        timestamp: metric.recorded_at,
        database: {
          connected: true,
          connectionCount: metric.db_connection_count || 0,
        },
        statistics: {
          totalOrganizations: metric.total_organizations || 0,
          totalStores: metric.total_stores || 0,
          totalUsers: metric.total_users || 0,
          activeUsers24h: metric.active_users_24h || 0,
        },
        performance: {
          avgResponseTime: metric.avg_response_time_ms || 0,
          maxResponseTime: 0,
          totalRequests: 0,
          errorRate: 0,
        },
        errors: {
          lastHour: metric.errors_last_hour || 0,
          last24Hours: metric.errors_last_24h || 0,
          critical24h: metric.critical_errors_24h || 0,
        },
        resources: {
          aiRequestsToday: metric.ai_requests_today || 0,
          edgeFunctionsToday: metric.edge_functions_today || 0,
        },
      }));
    } catch (error) {
      console.error('Error fetching health history:', error);
      throw error;
    }
  },

  async getPerformanceTrends(hours: number = 24): Promise<PerformanceTrendPoint[]> {
    try {
      const { data, error } = await supabase
        .from('api_performance_logs')
        .select('recorded_at, duration_ms, status_code')
        .gte('recorded_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: true });

      if (error) throw error;

      // Group by hour
      const hourlyData = new Map<string, { total: number; count: number; errors: number }>();

      (data || []).forEach(log => {
        const hour = new Date(log.recorded_at).toISOString().slice(0, 13) + ':00:00';
        const current = hourlyData.get(hour) || { total: 0, count: 0, errors: 0 };

        current.total += log.duration_ms;
        current.count += 1;
        if (log.status_code >= 400) {
          current.errors += 1;
        }

        hourlyData.set(hour, current);
      });

      return Array.from(hourlyData.entries()).map(([timestamp, stats]) => ({
        timestamp,
        avgResponseTime: stats.total / stats.count,
        requestCount: stats.count,
        errorRate: (stats.errors / stats.count) * 100,
      }));
    } catch (error) {
      console.error('Error fetching performance trends:', error);
      return [];
    }
  },

  async getRecentAlerts(limit: number = 20): Promise<AlertItem[]> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(log => ({
        id: log.id,
        severity: log.severity === 'critical' ? 'critical' :
                  log.severity === 'error' ? 'high' :
                  log.severity === 'warning' ? 'medium' : 'low',
        message: log.message || 'Unknown error',
        timestamp: log.created_at,
        category: 'error' as const,
        resolved: false,
      }));
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  },

  async recordPerformanceLog(
    endpoint: string,
    method: string,
    durationMs: number,
    statusCode: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase
        .from('api_performance_logs')
        .insert({
          endpoint,
          method,
          duration_ms: durationMs,
          status_code: statusCode,
          user_id: user?.id,
          error_message: errorMessage,
        });
    } catch (error) {
      console.error('Error recording performance log:', error);
    }
  },
};
