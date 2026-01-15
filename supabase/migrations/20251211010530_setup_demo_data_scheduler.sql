/*
  # Setup Demo Data Refresh Scheduler

  1. Scheduler Setup
    - Create pg_cron job to run monthly on the 1st day
    - Automatically maintains rolling 3-month demo data window
    - Runs at 3 AM UTC to avoid peak usage times

  2. Manual Execution
    - Admins can manually trigger refresh via `trigger_demo_data_refresh()`
    - Returns detailed JSON log of actions taken

  3. Monitoring
    - Logs operations to system for tracking
    - Returns status of each action (DELETED, GENERATED, EXISTS, COMPLETED)
*/

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any existing demo data refresh job
SELECT cron.unschedule('demo-data-refresh') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'demo-data-refresh'
);

-- Schedule monthly demo data refresh
-- Runs on the 1st of every month at 3:00 AM UTC
SELECT cron.schedule(
  'demo-data-refresh',
  '0 3 1 * *', -- At 03:00 on day-of-month 1
  $$SELECT refresh_demo_data();$$
);

-- Create a view to check the status of demo data
CREATE OR REPLACE VIEW demo_data_status AS
SELECT
  to_char(date_trunc('month', date), 'YYYY-MM') as month,
  COUNT(DISTINCT date) as days_with_data,
  COUNT(*) as total_records,
  COUNT(DISTINCT store_id) as stores_count,
  MIN(date) as first_date,
  MAX(date) as last_date
FROM fixed_demo_reports
GROUP BY date_trunc('month', date)
ORDER BY month DESC;

-- Grant access to the view
GRANT SELECT ON demo_data_status TO authenticated;

-- Create function to get demo data status
CREATE OR REPLACE FUNCTION get_demo_data_status()
RETURNS TABLE (
  month text,
  days_with_data bigint,
  total_records bigint,
  stores_count bigint,
  first_date date,
  last_date date,
  is_current_month boolean,
  is_complete boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dds.month,
    dds.days_with_data,
    dds.total_records,
    dds.stores_count,
    dds.first_date,
    dds.last_date,
    (dds.month = to_char(CURRENT_DATE, 'YYYY-MM')) as is_current_month,
    (dds.days_with_data >= 28) as is_complete -- At least 28 days = complete month
  FROM demo_data_status dds
  ORDER BY dds.month DESC
  LIMIT 6;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_demo_data_status() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_demo_data_status() IS 'Returns status of demo data including completeness and date ranges for recent months.';
COMMENT ON VIEW demo_data_status IS 'Summary view showing demo data availability by month.';
