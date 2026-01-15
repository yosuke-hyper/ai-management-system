/*
  # Fix Security and Performance Issues - Final

  ## Changes Made

  ### 1. Add Missing Foreign Key Indexes
  - Add index on `api_performance_logs.user_id`
  - Add index on `fixed_demo_reports.last_edited_by`
  - Add index on `system_admins.granted_by`

  ### 2. Optimize RLS Policies
  Fix RLS policies to use `(select auth.uid())` for better performance

  ### 3. Drop Unused Indexes
  Remove unused indexes to reduce overhead

  ### 4. Fix Function Search Paths
  Update functions with immutable search paths

  ## Security Notes
  - Maintains existing access control
  - Improves query performance
  - Reduces maintenance overhead
*/

-- =====================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_api_performance_logs_user_id 
  ON api_performance_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_fixed_demo_reports_last_edited_by 
  ON fixed_demo_reports(last_edited_by);

CREATE INDEX IF NOT EXISTS idx_system_admins_granted_by 
  ON system_admins(granted_by);

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES - organization_subscriptions
-- =====================================================

DROP POLICY IF EXISTS "Members can view subscription" ON organization_subscriptions;
CREATE POLICY "Members can view subscription"
  ON organization_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organization_subscriptions.organization_id
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners can delete subscription" ON organization_subscriptions;
CREATE POLICY "Owners can delete subscription"
  ON organization_subscriptions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organization_subscriptions.organization_id
      AND user_id = (select auth.uid())
      AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Owners can insert subscription" ON organization_subscriptions;
CREATE POLICY "Owners can insert subscription"
  ON organization_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organization_subscriptions.organization_id
      AND user_id = (select auth.uid())
      AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Owners can update subscription" ON organization_subscriptions;
CREATE POLICY "Owners can update subscription"
  ON organization_subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organization_subscriptions.organization_id
      AND user_id = (select auth.uid())
      AND role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organization_subscriptions.organization_id
      AND user_id = (select auth.uid())
      AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Super admins can view all subscriptions" ON organization_subscriptions;
CREATE POLICY "Super admins can view all subscriptions"
  ON organization_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = (select auth.uid())
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - ai_generated_reports
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can insert reports" ON ai_generated_reports;
CREATE POLICY "Authenticated users can insert reports"
  ON ai_generated_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = (select auth.uid())
      AND organization_id = ai_generated_reports.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can delete own organization reports" ON ai_generated_reports;
CREATE POLICY "Users can delete own organization reports"
  ON ai_generated_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = ai_generated_reports.organization_id
      AND user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'manager')
    )
  );

-- =====================================================
-- 4. OPTIMIZE RLS POLICIES - organizations
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view all organizations" ON organizations;
CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = (select auth.uid())
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- =====================================================
-- 5. OPTIMIZE RLS POLICIES - organization_members
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view all organization members" ON organization_members;
CREATE POLICY "Super admins can view all organization members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = (select auth.uid())
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- =====================================================
-- 6. OPTIMIZE RLS POLICIES - profiles
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
CREATE POLICY "Super admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = (select auth.uid())
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- =====================================================
-- 7. OPTIMIZE RLS POLICIES - system_admins
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own system admin record" ON system_admins;
CREATE POLICY "Users can view their own system admin record"
  ON system_admins FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- 8. OPTIMIZE RLS POLICIES - admin_activity_logs
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON admin_activity_logs;
CREATE POLICY "Authenticated users can insert activity logs"
  ON admin_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Super admins can view all activity logs" ON admin_activity_logs;
CREATE POLICY "Super admins can view all activity logs"
  ON admin_activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = (select auth.uid())
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- =====================================================
-- 9. OPTIMIZE RLS POLICIES - system_health_metrics
-- =====================================================

DROP POLICY IF EXISTS "Super admins can insert health metrics" ON system_health_metrics;
CREATE POLICY "Super admins can insert health metrics"
  ON system_health_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = (select auth.uid())
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

DROP POLICY IF EXISTS "Super admins can read health metrics" ON system_health_metrics;
CREATE POLICY "Super admins can read health metrics"
  ON system_health_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = (select auth.uid())
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- =====================================================
-- 10. OPTIMIZE RLS POLICIES - api_performance_logs
-- =====================================================

DROP POLICY IF EXISTS "Super admins can insert performance logs" ON api_performance_logs;
CREATE POLICY "Super admins can insert performance logs"
  ON api_performance_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = (select auth.uid())
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

DROP POLICY IF EXISTS "Super admins can read performance logs" ON api_performance_logs;
CREATE POLICY "Super admins can read performance logs"
  ON api_performance_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = (select auth.uid())
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- =====================================================
-- 11. OPTIMIZE RLS POLICIES - stores
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view all stores" ON stores;
CREATE POLICY "Super admins can view all stores"
  ON stores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = (select auth.uid())
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- =====================================================
-- 12. OPTIMIZE RLS POLICIES - store_regular_closed_days
-- =====================================================

DROP POLICY IF EXISTS "Organization members can view regular closed days" ON store_regular_closed_days;
CREATE POLICY "Organization members can view regular closed days"
  ON store_regular_closed_days FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores s
      JOIN organization_members om ON om.organization_id = s.organization_id
      WHERE s.id = store_regular_closed_days.store_id
      AND om.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners and admins can create regular closed days" ON store_regular_closed_days;
CREATE POLICY "Owners and admins can create regular closed days"
  ON store_regular_closed_days FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores s
      JOIN organization_members om ON om.organization_id = s.organization_id
      WHERE s.id = store_regular_closed_days.store_id
      AND om.user_id = (select auth.uid())
      AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Owners and admins can delete regular closed days" ON store_regular_closed_days;
CREATE POLICY "Owners and admins can delete regular closed days"
  ON store_regular_closed_days FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores s
      JOIN organization_members om ON om.organization_id = s.organization_id
      WHERE s.id = store_regular_closed_days.store_id
      AND om.user_id = (select auth.uid())
      AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Owners and admins can update regular closed days" ON store_regular_closed_days;
CREATE POLICY "Owners and admins can update regular closed days"
  ON store_regular_closed_days FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores s
      JOIN organization_members om ON om.organization_id = s.organization_id
      WHERE s.id = store_regular_closed_days.store_id
      AND om.user_id = (select auth.uid())
      AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores s
      JOIN organization_members om ON om.organization_id = s.organization_id
      WHERE s.id = store_regular_closed_days.store_id
      AND om.user_id = (select auth.uid())
      AND om.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 13. OPTIMIZE RLS POLICIES - store_holidays
-- =====================================================

DROP POLICY IF EXISTS "Organization members can view holidays" ON store_holidays;
CREATE POLICY "Organization members can view holidays"
  ON store_holidays FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores s
      JOIN organization_members om ON om.organization_id = s.organization_id
      WHERE s.id = store_holidays.store_id
      AND om.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners and admins can create holidays" ON store_holidays;
CREATE POLICY "Owners and admins can create holidays"
  ON store_holidays FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores s
      JOIN organization_members om ON om.organization_id = s.organization_id
      WHERE s.id = store_holidays.store_id
      AND om.user_id = (select auth.uid())
      AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Owners and admins can delete holidays" ON store_holidays;
CREATE POLICY "Owners and admins can delete holidays"
  ON store_holidays FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores s
      JOIN organization_members om ON om.organization_id = s.organization_id
      WHERE s.id = store_holidays.store_id
      AND om.user_id = (select auth.uid())
      AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Owners and admins can update holidays" ON store_holidays;
CREATE POLICY "Owners and admins can update holidays"
  ON store_holidays FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores s
      JOIN organization_members om ON om.organization_id = s.organization_id
      WHERE s.id = store_holidays.store_id
      AND om.user_id = (select auth.uid())
      AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores s
      JOIN organization_members om ON om.organization_id = s.organization_id
      WHERE s.id = store_holidays.store_id
      AND om.user_id = (select auth.uid())
      AND om.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 14. OPTIMIZE RLS POLICIES - daily_reports
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view all daily reports" ON daily_reports;
CREATE POLICY "Super admins can view all daily reports"
  ON daily_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = (select auth.uid())
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- =====================================================
-- 15. OPTIMIZE RLS POLICIES - error_logs
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete error logs" ON error_logs;
CREATE POLICY "Admins can delete error logs"
  ON error_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = error_logs.organization_id
      AND user_id = (select auth.uid())
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update error logs" ON error_logs;
CREATE POLICY "Admins can update error logs"
  ON error_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = error_logs.organization_id
      AND user_id = (select auth.uid())
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = error_logs.organization_id
      AND user_id = (select auth.uid())
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can view all error logs" ON error_logs;
CREATE POLICY "Admins can view all error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = error_logs.organization_id
      AND user_id = (select auth.uid())
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create error logs" ON error_logs;
CREATE POLICY "Authenticated users can create error logs"
  ON error_logs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Super admins can view all error logs" ON error_logs;
CREATE POLICY "Super admins can view all error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = (select auth.uid())
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

DROP POLICY IF EXISTS "Users can view own error logs" ON error_logs;
CREATE POLICY "Users can view own error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- 16. DROP UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_organization_members_user_role;
DROP INDEX IF EXISTS idx_organization_members_org_user;
DROP INDEX IF EXISTS idx_organization_members_store_id;
DROP INDEX IF EXISTS idx_admin_override_logs_admin_user_id;
DROP INDEX IF EXISTS idx_admin_override_logs_organization_id;
DROP INDEX IF EXISTS idx_admin_override_logs_store_id;
DROP INDEX IF EXISTS idx_ai_conversations_demo_session_id;
DROP INDEX IF EXISTS idx_ai_conversations_organization_id;
DROP INDEX IF EXISTS idx_ai_generated_reports_organization_id;
DROP INDEX IF EXISTS idx_ai_messages_organization_id;
DROP INDEX IF EXISTS idx_ai_usage_tracking_store_id;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_error_logs_organization_id;
DROP INDEX IF EXISTS idx_error_logs_resolved_by;
DROP INDEX IF EXISTS idx_error_logs_user_id;
DROP INDEX IF EXISTS idx_daily_report_vendor_purchases_organization_id;
DROP INDEX IF EXISTS idx_daily_report_vendor_purchases_vendor_id;
DROP INDEX IF EXISTS idx_daily_reports_organization_id;
DROP INDEX IF EXISTS daily_reports_last_edited_by_idx;
DROP INDEX IF EXISTS daily_reports_last_edited_at_idx;
DROP INDEX IF EXISTS idx_daily_targets_organization_id;
DROP INDEX IF EXISTS idx_expense_baselines_organization_id;
DROP INDEX IF EXISTS idx_demo_monthly_expenses_demo_org_id;
DROP INDEX IF EXISTS idx_demo_stores_brand_id;
DROP INDEX IF EXISTS idx_fixed_demo_stores_brand_id;
DROP INDEX IF EXISTS idx_notifications_organization_id;
DROP INDEX IF EXISTS idx_organization_invitations_invited_by;
DROP INDEX IF EXISTS idx_profiles_organization_id;
DROP INDEX IF EXISTS idx_organization_subscriptions_plan_id;
DROP INDEX IF EXISTS idx_report_generation_logs_organization_id;
DROP INDEX IF EXISTS idx_report_generation_logs_report_id;
DROP INDEX IF EXISTS idx_report_generation_logs_schedule_id;
DROP INDEX IF EXISTS idx_report_generation_logs_store_id;
DROP INDEX IF EXISTS idx_report_schedules_store_id;
DROP INDEX IF EXISTS idx_store_assignments_organization_id;
DROP INDEX IF EXISTS idx_store_assignments_store_id;
DROP INDEX IF EXISTS idx_store_vendor_assignments_vendor_id;
DROP INDEX IF EXISTS idx_stores_brand_id;
DROP INDEX IF EXISTS idx_stores_manager_id;
DROP INDEX IF EXISTS idx_summary_data_store_id;
DROP INDEX IF EXISTS idx_system_admins_expires;
DROP INDEX IF EXISTS idx_admin_activity_logs_target_org;
DROP INDEX IF EXISTS idx_admin_activity_logs_created_at;
DROP INDEX IF EXISTS idx_health_metrics_recorded_at;
DROP INDEX IF EXISTS idx_health_metrics_status;
DROP INDEX IF EXISTS idx_performance_logs_endpoint;
DROP INDEX IF EXISTS idx_performance_logs_org;
DROP INDEX IF EXISTS idx_store_regular_closed_days_org;
DROP INDEX IF EXISTS idx_store_holidays_org;
DROP INDEX IF EXISTS idx_store_holidays_date;

-- =====================================================
-- 17. FIX FUNCTION SEARCH PATHS
-- =====================================================

ALTER FUNCTION update_contracted_stores() SET search_path = public, pg_temp;
ALTER FUNCTION get_plan_ai_limit(text) SET search_path = public, pg_temp;
ALTER FUNCTION sync_store_ai_limit() SET search_path = public, pg_temp;
ALTER FUNCTION update_all_stores_ai_limits() SET search_path = public, pg_temp;
ALTER FUNCTION update_system_admins_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION prevent_audit_log_deletion() SET search_path = public, pg_temp;
ALTER FUNCTION is_super_admin(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION has_super_admin_permission(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION log_organization_switch(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION log_error_log_view(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION log_error_logs_batch_view(uuid, integer) SET search_path = public, pg_temp;
ALTER FUNCTION get_admin_activity_stats(uuid, integer) SET search_path = public, pg_temp;
