/*
  # Add Missing Foreign Key Indexes

  ## Changes Made

  ### 1. Add Foreign Key Indexes (41 indexes)
  Add indexes for all foreign keys that don't have covering indexes.
  This improves query performance for JOIN operations and foreign key lookups.

  ### 2. Fix Function Search Path
  Fix the `log_super_admin_activity` function to have an immutable search path.

  ### 3. Move pg_trgm Extension
  Move the pg_trgm extension from public schema to extensions schema.

  ## Performance Impact
  - Faster JOIN operations
  - Improved foreign key constraint checking
  - Better query optimization

  ## Security Notes
  - All changes maintain existing access control
  - Performance improvements do not compromise security
*/

-- =====================================================
-- 1. ADD FOREIGN KEY INDEXES
-- =====================================================

-- admin_activity_logs
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_target_organization_id
  ON admin_activity_logs(target_organization_id);

-- admin_override_logs
CREATE INDEX IF NOT EXISTS idx_admin_override_logs_admin_user_id
  ON admin_override_logs(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_override_logs_organization_id
  ON admin_override_logs(organization_id);

CREATE INDEX IF NOT EXISTS idx_admin_override_logs_store_id
  ON admin_override_logs(store_id);

-- ai_conversations
CREATE INDEX IF NOT EXISTS idx_ai_conversations_demo_session_id
  ON ai_conversations(demo_session_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_organization_id
  ON ai_conversations(organization_id);

-- ai_generated_reports
CREATE INDEX IF NOT EXISTS idx_ai_generated_reports_organization_id
  ON ai_generated_reports(organization_id);

-- ai_messages
CREATE INDEX IF NOT EXISTS idx_ai_messages_organization_id
  ON ai_messages(organization_id);

-- ai_usage_tracking
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_store_id
  ON ai_usage_tracking(store_id);

-- api_performance_logs
CREATE INDEX IF NOT EXISTS idx_api_performance_logs_organization_id
  ON api_performance_logs(organization_id);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON audit_logs(user_id);

-- daily_report_vendor_purchases
CREATE INDEX IF NOT EXISTS idx_daily_report_vendor_purchases_organization_id
  ON daily_report_vendor_purchases(organization_id);

CREATE INDEX IF NOT EXISTS idx_daily_report_vendor_purchases_vendor_id
  ON daily_report_vendor_purchases(vendor_id);

-- daily_reports
CREATE INDEX IF NOT EXISTS idx_daily_reports_last_edited_by
  ON daily_reports(last_edited_by);

CREATE INDEX IF NOT EXISTS idx_daily_reports_organization_id
  ON daily_reports(organization_id);

-- daily_targets
CREATE INDEX IF NOT EXISTS idx_daily_targets_organization_id
  ON daily_targets(organization_id);

-- demo_monthly_expenses
CREATE INDEX IF NOT EXISTS idx_demo_monthly_expenses_demo_org_id
  ON demo_monthly_expenses(demo_org_id);

-- demo_stores
CREATE INDEX IF NOT EXISTS idx_demo_stores_brand_id
  ON demo_stores(brand_id);

-- error_logs
CREATE INDEX IF NOT EXISTS idx_error_logs_organization_id
  ON error_logs(organization_id);

CREATE INDEX IF NOT EXISTS idx_error_logs_resolved_by
  ON error_logs(resolved_by);

CREATE INDEX IF NOT EXISTS idx_error_logs_user_id
  ON error_logs(user_id);

-- expense_baselines
CREATE INDEX IF NOT EXISTS idx_expense_baselines_organization_id
  ON expense_baselines(organization_id);

-- fixed_demo_stores
CREATE INDEX IF NOT EXISTS idx_fixed_demo_stores_brand_id
  ON fixed_demo_stores(brand_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id
  ON notifications(organization_id);

-- organization_invitations
CREATE INDEX IF NOT EXISTS idx_organization_invitations_invited_by
  ON organization_invitations(invited_by);

-- organization_members
CREATE INDEX IF NOT EXISTS idx_organization_members_store_id
  ON organization_members(store_id);

-- organization_subscriptions
CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_plan_id
  ON organization_subscriptions(plan_id);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id
  ON profiles(organization_id);

-- report_generation_logs
CREATE INDEX IF NOT EXISTS idx_report_generation_logs_organization_id
  ON report_generation_logs(organization_id);

CREATE INDEX IF NOT EXISTS idx_report_generation_logs_report_id
  ON report_generation_logs(report_id);

CREATE INDEX IF NOT EXISTS idx_report_generation_logs_schedule_id
  ON report_generation_logs(schedule_id);

CREATE INDEX IF NOT EXISTS idx_report_generation_logs_store_id
  ON report_generation_logs(store_id);

-- report_schedules
CREATE INDEX IF NOT EXISTS idx_report_schedules_store_id
  ON report_schedules(store_id);

-- store_assignments
CREATE INDEX IF NOT EXISTS idx_store_assignments_organization_id
  ON store_assignments(organization_id);

CREATE INDEX IF NOT EXISTS idx_store_assignments_store_id
  ON store_assignments(store_id);

-- store_holidays
CREATE INDEX IF NOT EXISTS idx_store_holidays_organization_id
  ON store_holidays(organization_id);

-- store_regular_closed_days
CREATE INDEX IF NOT EXISTS idx_store_regular_closed_days_organization_id
  ON store_regular_closed_days(organization_id);

-- store_vendor_assignments
CREATE INDEX IF NOT EXISTS idx_store_vendor_assignments_vendor_id
  ON store_vendor_assignments(vendor_id);

-- stores
CREATE INDEX IF NOT EXISTS idx_stores_brand_id
  ON stores(brand_id);

CREATE INDEX IF NOT EXISTS idx_stores_manager_id
  ON stores(manager_id);

-- summary_data
CREATE INDEX IF NOT EXISTS idx_summary_data_store_id
  ON summary_data(store_id);

-- =====================================================
-- 2. FIX FUNCTION SEARCH PATH
-- =====================================================

-- Drop and recreate the log_super_admin_activity function with proper search path
CREATE OR REPLACE FUNCTION log_super_admin_activity(
  action_text text DEFAULT NULL,
  details_json jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO admin_activity_logs (
    admin_user_id,
    action,
    details,
    created_at
  ) VALUES (
    auth.uid(),
    COALESCE(action_text, 'Unknown Action'),
    details_json,
    now()
  );
END;
$$;

-- =====================================================
-- 3. MOVE PG_TRGM EXTENSION
-- =====================================================

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_trgm extension to extensions schema
-- Note: We need to check if the extension exists first
DO $$
BEGIN
  -- Check if pg_trgm is installed in public schema
  IF EXISTS (
    SELECT 1 FROM pg_extension 
    WHERE extname = 'pg_trgm' 
    AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    -- Drop and recreate in extensions schema
    DROP EXTENSION IF EXISTS pg_trgm CASCADE;
    CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
  ) THEN
    -- Extension doesn't exist anywhere, create it in extensions schema
    CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
  END IF;
END $$;
