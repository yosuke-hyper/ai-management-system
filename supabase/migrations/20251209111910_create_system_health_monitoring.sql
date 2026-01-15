/*
  # System Health Monitoring Tables

  1. New Tables
    - `system_health_metrics`
      - Stores periodic system health snapshots
      - Includes database stats, connection counts, error rates
      - Collected every 5 minutes via cron
    
    - `api_performance_logs`
      - Records API response times and performance data
      - Used for performance trend analysis
      - Includes endpoint, duration, status code
  
  2. Functions
    - `get_system_health_stats()` - Returns current system health metrics
    - `get_performance_summary()` - Returns aggregated performance data
    - `cleanup_old_metrics()` - Removes metrics older than 30 days
  
  3. Security
    - Enable RLS on all tables
    - Only super admins can read/write health metrics
    - Automated cron jobs use service role
  
  4. Indexes
    - Performance indexes on timestamp columns
    - Composite indexes for common queries
*/

-- System health metrics table
CREATE TABLE IF NOT EXISTS system_health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at timestamptz DEFAULT now() NOT NULL,
  
  -- Database metrics
  total_organizations int DEFAULT 0,
  total_stores int DEFAULT 0,
  total_users int DEFAULT 0,
  active_users_24h int DEFAULT 0,
  
  -- Performance metrics
  avg_response_time_ms numeric(10, 2) DEFAULT 0,
  db_connection_count int DEFAULT 0,
  
  -- Error metrics
  errors_last_hour int DEFAULT 0,
  errors_last_24h int DEFAULT 0,
  critical_errors_24h int DEFAULT 0,
  
  -- Resource usage
  storage_used_mb numeric(12, 2) DEFAULT 0,
  ai_requests_today int DEFAULT 0,
  edge_functions_today int DEFAULT 0,
  
  -- System status
  overall_status text DEFAULT 'healthy' CHECK (overall_status IN ('healthy', 'warning', 'critical')),
  notes text,
  
  created_at timestamptz DEFAULT now()
);

-- API performance logs table
CREATE TABLE IF NOT EXISTS api_performance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at timestamptz DEFAULT now() NOT NULL,
  
  endpoint text NOT NULL,
  method text NOT NULL,
  duration_ms numeric(10, 2) NOT NULL,
  status_code int NOT NULL,
  
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_performance_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_health_metrics (super admins only)
CREATE POLICY "Super admins can read health metrics"
  ON system_health_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE system_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can insert health metrics"
  ON system_health_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE system_admins.user_id = auth.uid()
    )
  );

-- RLS Policies for api_performance_logs (super admins only)
CREATE POLICY "Super admins can read performance logs"
  ON api_performance_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE system_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can insert performance logs"
  ON api_performance_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE system_admins.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_metrics_recorded_at 
  ON system_health_metrics(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_health_metrics_status 
  ON system_health_metrics(overall_status, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_logs_recorded_at 
  ON api_performance_logs(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_logs_endpoint 
  ON api_performance_logs(endpoint, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_logs_org 
  ON api_performance_logs(organization_id, recorded_at DESC);

-- Function to get current system health stats
CREATE OR REPLACE FUNCTION get_system_health_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_organizations', (SELECT COUNT(*) FROM organizations),
    'total_stores', (SELECT COUNT(*) FROM stores),
    'total_users', (SELECT COUNT(*) FROM profiles),
    'active_users_24h', (
      SELECT COUNT(DISTINCT user_id) 
      FROM audit_logs 
      WHERE created_at > now() - interval '24 hours'
    ),
    'errors_last_hour', (
      SELECT COUNT(*) 
      FROM error_logs 
      WHERE created_at > now() - interval '1 hour'
    ),
    'errors_last_24h', (
      SELECT COUNT(*) 
      FROM error_logs 
      WHERE created_at > now() - interval '24 hours'
    ),
    'critical_errors_24h', (
      SELECT COUNT(*) 
      FROM error_logs 
      WHERE severity = 'critical' 
      AND created_at > now() - interval '24 hours'
    ),
    'ai_requests_today', (
      SELECT COALESCE(SUM(requests_used), 0)
      FROM ai_usage_settings
      WHERE last_reset_at::date = CURRENT_DATE
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function to get performance summary
CREATE OR REPLACE FUNCTION get_performance_summary(hours int DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'avg_response_time', COALESCE(AVG(duration_ms), 0),
    'max_response_time', COALESCE(MAX(duration_ms), 0),
    'min_response_time', COALESCE(MIN(duration_ms), 0),
    'total_requests', COUNT(*),
    'error_rate', (
      COUNT(*) FILTER (WHERE status_code >= 400)::numeric / 
      NULLIF(COUNT(*), 0) * 100
    ),
    'slowest_endpoints', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'endpoint', endpoint,
          'avg_duration', avg_duration,
          'request_count', request_count
        )
      )
      FROM (
        SELECT 
          endpoint,
          AVG(duration_ms) as avg_duration,
          COUNT(*) as request_count
        FROM api_performance_logs
        WHERE recorded_at > now() - (hours || ' hours')::interval
        GROUP BY endpoint
        ORDER BY avg_duration DESC
        LIMIT 5
      ) slow_queries
    )
  ) INTO result
  FROM api_performance_logs
  WHERE recorded_at > now() - (hours || ' hours')::interval;
  
  RETURN result;
END;
$$;

-- Function to cleanup old metrics (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM system_health_metrics
  WHERE recorded_at < now() - interval '30 days';
  
  DELETE FROM api_performance_logs
  WHERE recorded_at < now() - interval '30 days';
END;
$$;

-- Create view for recent health metrics
CREATE OR REPLACE VIEW recent_health_metrics AS
SELECT 
  recorded_at,
  total_organizations,
  total_stores,
  total_users,
  active_users_24h,
  avg_response_time_ms,
  errors_last_24h,
  critical_errors_24h,
  overall_status
FROM system_health_metrics
WHERE recorded_at > now() - interval '7 days'
ORDER BY recorded_at DESC;

-- Insert initial health metric snapshot
INSERT INTO system_health_metrics (
  total_organizations,
  total_stores,
  total_users,
  active_users_24h,
  errors_last_hour,
  errors_last_24h,
  critical_errors_24h,
  overall_status
)
SELECT 
  (SELECT COUNT(*) FROM organizations),
  (SELECT COUNT(*) FROM stores),
  (SELECT COUNT(*) FROM profiles),
  (SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE created_at > now() - interval '24 hours'),
  (SELECT COUNT(*) FROM error_logs WHERE created_at > now() - interval '1 hour'),
  (SELECT COUNT(*) FROM error_logs WHERE created_at > now() - interval '24 hours'),
  (SELECT COUNT(*) FROM error_logs WHERE severity = 'critical' AND created_at > now() - interval '24 hours'),
  'healthy'
ON CONFLICT DO NOTHING;