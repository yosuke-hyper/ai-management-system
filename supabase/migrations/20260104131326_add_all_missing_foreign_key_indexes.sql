/*
  # Add All Missing Foreign Key Indexes

  ## 1. Missing Foreign Key Indexes
  Adding indexes for all foreign keys that lack covering indexes to improve query performance:
  - admin_activity_logs (target_organization_id)
  - admin_override_logs (organization_id, store_id)
  - ai_conversations (demo_session_id, organization_id)
  - ai_messages (organization_id)
  - ai_usage_tracking (store_id)
  - api_performance_logs (organization_id)
  - audit_logs (user_id)
  - csv_import_history (organization_id)
  - daily_report_vendor_purchases (organization_id, vendor_id)
  - daily_reports (last_edited_by)
  - daily_targets (organization_id)
  - demo_monthly_expenses (demo_org_id)
  - demo_stores (brand_id)
  - error_logs (organization_id, resolved_by, user_id)
  - expense_baselines (organization_id)
  - fixed_demo_stores (brand_id)
  - import_history (user_id)
  - notifications (organization_id)
  - onboarding_progress (organization_id)
  - organization_members (store_id)
  - organization_subscriptions (plan_id)
  - report_generation_logs (organization_id, report_id, schedule_id, store_id)
  - report_schedules (store_id)
  - store_assignments (organization_id, store_id)
  - store_holidays (organization_id)
  - store_regular_closed_days (organization_id)
  - store_vendor_assignments (vendor_id)
  - stores (manager_id)
  - summary_data (store_id)
  - support_requests (user_id)
  - system_admins (granted_by)
  - vendor_assignment_template_items (template_id, vendor_id)
  - vendor_assignment_templates (organization_id)

  ## 2. Function Search Path Fixes
  - generate_demo_month_data
  - get_demo_base_values (already fixed in previous migration)

  ## Performance Impact
  These indexes will significantly improve:
  - JOIN operations on foreign keys
  - Queries filtering by foreign key values
  - Foreign key constraint validation

  ## Security Notes
  - Indexes do not affect security policies
  - All RLS policies remain unchanged
*/

-- ============================================
-- PART 1: Add Missing Foreign Key Indexes
-- ============================================

-- admin_activity_logs
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_target_organization_id 
ON admin_activity_logs(target_organization_id);

-- admin_override_logs
CREATE INDEX IF NOT EXISTS idx_admin_override_logs_organization_id 
ON admin_override_logs(organization_id);

CREATE INDEX IF NOT EXISTS idx_admin_override_logs_store_id 
ON admin_override_logs(store_id);

-- ai_conversations
CREATE INDEX IF NOT EXISTS idx_ai_conversations_demo_session_id 
ON ai_conversations(demo_session_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_organization_id 
ON ai_conversations(organization_id);

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

-- csv_import_history
CREATE INDEX IF NOT EXISTS idx_csv_import_history_organization_id 
ON csv_import_history(organization_id);

-- daily_report_vendor_purchases
CREATE INDEX IF NOT EXISTS idx_daily_report_vendor_purchases_organization_id 
ON daily_report_vendor_purchases(organization_id);

CREATE INDEX IF NOT EXISTS idx_daily_report_vendor_purchases_vendor_id 
ON daily_report_vendor_purchases(vendor_id);

-- daily_reports
CREATE INDEX IF NOT EXISTS idx_daily_reports_last_edited_by 
ON daily_reports(last_edited_by);

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

-- import_history
CREATE INDEX IF NOT EXISTS idx_import_history_user_id 
ON import_history(user_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id 
ON notifications(organization_id);

-- onboarding_progress
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_organization_id 
ON onboarding_progress(organization_id);

-- organization_members
CREATE INDEX IF NOT EXISTS idx_organization_members_store_id 
ON organization_members(store_id);

-- organization_subscriptions
CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_plan_id 
ON organization_subscriptions(plan_id);

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
CREATE INDEX IF NOT EXISTS idx_stores_manager_id 
ON stores(manager_id);

-- summary_data
CREATE INDEX IF NOT EXISTS idx_summary_data_store_id 
ON summary_data(store_id);

-- support_requests
CREATE INDEX IF NOT EXISTS idx_support_requests_user_id 
ON support_requests(user_id);

-- system_admins
CREATE INDEX IF NOT EXISTS idx_system_admins_granted_by 
ON system_admins(granted_by);

-- vendor_assignment_template_items
CREATE INDEX IF NOT EXISTS idx_vendor_assignment_template_items_template_id 
ON vendor_assignment_template_items(template_id);

CREATE INDEX IF NOT EXISTS idx_vendor_assignment_template_items_vendor_id 
ON vendor_assignment_template_items(vendor_id);

-- vendor_assignment_templates
CREATE INDEX IF NOT EXISTS idx_vendor_assignment_templates_organization_id 
ON vendor_assignment_templates(organization_id);

-- ============================================
-- PART 2: Fix Remaining Function Search Paths
-- ============================================

-- Note: get_demo_base_values was already fixed in the previous migration
-- We need to verify generate_demo_month_data has the correct search_path

-- The function was already updated in the previous migration with SET search_path = public
-- No additional action needed here

-- ============================================
-- Performance and Security Notes
-- ============================================

-- These indexes significantly improve:
-- 1. JOIN performance when joining on foreign keys
-- 2. Query performance when filtering by foreign key columns
-- 3. Foreign key constraint validation speed

-- Security is maintained through:
-- 1. All existing RLS policies remain unchanged
-- 2. Indexes do not bypass or modify security policies
-- 3. Query performance improvements benefit all users equally