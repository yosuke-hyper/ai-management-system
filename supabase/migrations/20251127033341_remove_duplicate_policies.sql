/*
  # Remove duplicate policies

  ## 概要
  重複するpermissiveポリシーを削除して、Multiple Permissive Policiesの警告を解決します。

  ## 変更内容
  各テーブルで重複しているポリシーを削除し、1つの最適化されたポリシーのみを保持します。
*/

-- ============================================================================
-- audit_logs - Keep only new optimized versions
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Organization admins can view audit logs" ON audit_logs;

-- ============================================================================
-- brands - Keep only new optimized versions
-- ============================================================================

DROP POLICY IF EXISTS "Admins can create brands" ON brands;
DROP POLICY IF EXISTS "Organization members can view brands" ON brands;

-- ============================================================================
-- daily_reports
-- ============================================================================

DROP POLICY IF EXISTS "dr_select" ON daily_reports;

-- ============================================================================
-- daily_targets
-- ============================================================================

DROP POLICY IF EXISTS "Admins can create daily targets" ON daily_targets;
DROP POLICY IF EXISTS "Admins can view all daily targets" ON daily_targets;
DROP POLICY IF EXISTS "Admins can update daily targets" ON daily_targets;

-- ============================================================================
-- demo_ai_reports - Already consolidated to single policy
-- ============================================================================

-- ============================================================================
-- demo_ai_usage_tracking
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can insert demo AI usage" ON demo_ai_usage_tracking;
DROP POLICY IF EXISTS "Anyone can read demo AI usage" ON demo_ai_usage_tracking;
DROP POLICY IF EXISTS "Anyone can update demo AI usage" ON demo_ai_usage_tracking;

-- ============================================================================
-- demo_monthly_expenses  
-- ============================================================================

DROP POLICY IF EXISTS "No modifications to demo monthly expenses" ON demo_monthly_expenses;
DROP POLICY IF EXISTS "Public can read demo monthly expenses" ON demo_monthly_expenses;

-- ============================================================================
-- demo_organizations - Already consolidated to single policy
-- ============================================================================

-- ============================================================================
-- demo_reports - Already consolidated to single policy
-- ============================================================================

-- ============================================================================
-- demo_sessions - Already consolidated to single policy
-- ============================================================================

-- ============================================================================
-- demo_stores - Already consolidated to single policy
-- ============================================================================

-- ============================================================================
-- error_logs
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all error logs" ON error_logs;

-- ============================================================================
-- expense_baselines
-- ============================================================================

DROP POLICY IF EXISTS "expense_baselines_delete" ON expense_baselines;
DROP POLICY IF EXISTS "expense_baselines_insert" ON expense_baselines;
DROP POLICY IF EXISTS "expense_baselines_select" ON expense_baselines;
DROP POLICY IF EXISTS "expense_baselines_update" ON expense_baselines;

-- ============================================================================
-- monthly_expenses
-- ============================================================================

DROP POLICY IF EXISTS "me_delete" ON monthly_expenses;
DROP POLICY IF EXISTS "me_insert" ON monthly_expenses;
DROP POLICY IF EXISTS "me_select" ON monthly_expenses;
DROP POLICY IF EXISTS "me_update" ON monthly_expenses;

-- ============================================================================
-- notifications - Keep only new optimized versions
-- ============================================================================

DROP POLICY IF EXISTS "Admins can create notifications for org members" ON notifications;
DROP POLICY IF EXISTS "Users can update own notification read status" ON notifications;

-- ============================================================================
-- organization_members
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own membership" ON organization_members;

-- ============================================================================
-- organization_subscriptions - Keep only new optimized versions
-- ============================================================================

DROP POLICY IF EXISTS "Organization members can view subscription" ON organization_subscriptions;
DROP POLICY IF EXISTS "Organization owners can manage subscription" ON organization_subscriptions;

-- ============================================================================
-- profiles
-- ============================================================================

DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can read member profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;

-- ============================================================================
-- report_schedules
-- ============================================================================

DROP POLICY IF EXISTS "Admins can delete schedules" ON report_schedules;
DROP POLICY IF EXISTS "Admins can insert schedules" ON report_schedules;
DROP POLICY IF EXISTS "Admins can view all schedules" ON report_schedules;
DROP POLICY IF EXISTS "Admins can update schedules" ON report_schedules;

-- ============================================================================
-- store_assignments
-- ============================================================================

DROP POLICY IF EXISTS "sa_delete" ON store_assignments;
DROP POLICY IF EXISTS "sa_insert" ON store_assignments;
DROP POLICY IF EXISTS "sa_select" ON store_assignments;

-- ============================================================================
-- stores
-- ============================================================================

DROP POLICY IF EXISTS "stores_delete" ON stores;
DROP POLICY IF EXISTS "stores_insert" ON stores;
DROP POLICY IF EXISTS "stores_select" ON stores;
DROP POLICY IF EXISTS "stores_update" ON stores;
DROP POLICY IF EXISTS "Users can read active stores" ON stores;

-- ============================================================================
-- subscription_plans
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view active plans" ON subscription_plans;

-- ============================================================================
-- usage_counters
-- ============================================================================

DROP POLICY IF EXISTS "System can update usage counters" ON usage_counters;
