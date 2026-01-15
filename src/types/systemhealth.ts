export type SystemStatus = 'healthy' | 'warning' | 'critical';

export interface DatabaseHealth {
  connected: boolean;
  connectionCount: number;
}

export interface SystemStatistics {
  totalOrganizations: number;
  totalStores: number;
  totalUsers: number;
  activeUsers24h: number;
}

export interface PerformanceMetrics {
  avgResponseTime: number;
  maxResponseTime: number;
  totalRequests: number;
  errorRate: number;
}

export interface ErrorMetrics {
  lastHour: number;
  last24Hours: number;
  critical24h: number;
}

export interface ResourceUsage {
  aiRequestsToday: number;
  edgeFunctionsToday: number;
}

export interface HealthMetrics {
  status: SystemStatus;
  timestamp: string;
  database: DatabaseHealth;
  statistics: SystemStatistics;
  performance: PerformanceMetrics;
  errors: ErrorMetrics;
  resources: ResourceUsage;
}

export interface HealthMetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  status?: SystemStatus;
  subtitle?: string;
}

export interface AlertItem {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: string;
  category: 'error' | 'performance' | 'resource' | 'security';
  resolved: boolean;
}

export interface PerformanceTrendPoint {
  timestamp: string;
  avgResponseTime: number;
  requestCount: number;
  errorRate: number;
}

export interface SlowEndpoint {
  endpoint: string;
  avgDuration: number;
  requestCount: number;
}
