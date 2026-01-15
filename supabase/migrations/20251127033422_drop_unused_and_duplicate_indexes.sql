/*
  # Drop unused and duplicate indexes

  ## 概要
  使用されていないインデックスと重複するインデックスを削除して、データベースのパフォーマンスとストレージを最適化します。

  ## 変更内容
  1. 使用されていないインデックスを削除
  2. 重複するインデックスを削除（より良い名前のものを保持）

  ## 削除するインデックス
  - Unused indexes across multiple tables
  - Duplicate indexes (keep the one with better naming)
*/

-- ============================================================================
-- Drop duplicate indexes (keep unique constraints, drop redundant indexes)
-- ============================================================================

DROP INDEX IF EXISTS idx_store_assignments_user_store;
DROP INDEX IF EXISTS idx_store_vendor_unique;

-- ============================================================================
-- Drop unused indexes - profiles
-- ============================================================================

DROP INDEX IF EXISTS profiles_email_idx;
DROP INDEX IF EXISTS profiles_role_idx;
DROP INDEX IF EXISTS idx_profiles_organization;

-- ============================================================================
-- Drop unused indexes - stores
-- ============================================================================

DROP INDEX IF EXISTS stores_active_idx;
DROP INDEX IF EXISTS idx_stores_manager;
DROP INDEX IF EXISTS idx_stores_brand;

-- ============================================================================
-- Drop unused indexes - store_assignments
-- ============================================================================

DROP INDEX IF EXISTS store_assignments_user_idx;
DROP INDEX IF EXISTS store_assignments_store_idx;
DROP INDEX IF EXISTS idx_store_assignments_organization;

-- ============================================================================
-- Drop unused indexes - daily_reports
-- ============================================================================

DROP INDEX IF EXISTS daily_reports_user_idx;
DROP INDEX IF EXISTS idx_daily_reports_created;
DROP INDEX IF EXISTS idx_daily_reports_organization;
DROP INDEX IF EXISTS daily_reports_operation_type_idx;

-- ============================================================================
-- Drop unused indexes - summary_data
-- ============================================================================

DROP INDEX IF EXISTS summary_data_period_idx;
DROP INDEX IF EXISTS summary_data_store_idx;
DROP INDEX IF EXISTS idx_summary_period_store_dates;
DROP INDEX IF EXISTS idx_summary_date_range;

-- ============================================================================
-- Drop unused indexes - ai_messages
-- ============================================================================

DROP INDEX IF EXISTS idx_ai_messages_trgm;
DROP INDEX IF EXISTS idx_ai_messages_organization;

-- ============================================================================
-- Drop unused indexes - vendors
-- ============================================================================

DROP INDEX IF EXISTS vendors_category_idx;
DROP INDEX IF EXISTS vendors_active_idx;
DROP INDEX IF EXISTS idx_vendors_category;

-- ============================================================================
-- Drop unused indexes - store_vendor_assignments
-- ============================================================================

DROP INDEX IF EXISTS store_vendor_assignments_store_id_idx;
DROP INDEX IF EXISTS store_vendor_assignments_vendor_id_idx;
DROP INDEX IF EXISTS idx_store_vendor_store;

-- ============================================================================
-- Drop unused indexes - fixed_demo tables
-- ============================================================================

DROP INDEX IF EXISTS idx_fixed_demo_monthly_expenses_store;
DROP INDEX IF EXISTS idx_fixed_demo_brands_type;
DROP INDEX IF EXISTS idx_fixed_demo_stores_brand;

-- ============================================================================
-- Drop unused indexes - daily_report_vendor_purchases
-- ============================================================================

DROP INDEX IF EXISTS daily_report_vendor_purchases_report_id_idx;
DROP INDEX IF EXISTS daily_report_vendor_purchases_vendor_id_idx;
DROP INDEX IF EXISTS idx_daily_report_vendor_purchases_organization;

-- ============================================================================
-- Drop unused indexes - monthly_expenses
-- ============================================================================

DROP INDEX IF EXISTS monthly_expenses_user_id_idx;

-- ============================================================================
-- Drop unused indexes - daily_targets
-- ============================================================================

DROP INDEX IF EXISTS idx_daily_targets_date;
DROP INDEX IF EXISTS idx_daily_targets_organization;

-- ============================================================================
-- Drop unused indexes - targets
-- ============================================================================

DROP INDEX IF EXISTS targets_store_period_idx;

-- ============================================================================
-- Drop unused indexes - report_schedules
-- ============================================================================

DROP INDEX IF EXISTS idx_report_schedules_enabled;
DROP INDEX IF EXISTS idx_report_schedules_store_id_fk;

-- ============================================================================
-- Drop unused indexes - report_generation_logs
-- ============================================================================

DROP INDEX IF EXISTS idx_report_logs_status_started;
DROP INDEX IF EXISTS idx_report_generation_logs_organization;
DROP INDEX IF EXISTS idx_report_generation_logs_report_id_fk;
DROP INDEX IF EXISTS idx_report_generation_logs_schedule_id_fk;
DROP INDEX IF EXISTS idx_report_generation_logs_store_id_fk;

-- ============================================================================
-- Drop unused indexes - ai_generated_reports
-- ============================================================================

DROP INDEX IF EXISTS idx_ai_reports_store_type_period;
DROP INDEX IF EXISTS idx_ai_reports_share_token;
DROP INDEX IF EXISTS idx_ai_generated_reports_organization;

-- ============================================================================
-- Drop unused indexes - ai_usage_tracking
-- ============================================================================

DROP INDEX IF EXISTS idx_ai_usage_tracking_store_date;

-- ============================================================================
-- Drop unused indexes - ai_conversations
-- ============================================================================

DROP INDEX IF EXISTS idx_ai_conversations_demo_session;
DROP INDEX IF EXISTS idx_ai_conversations_organization;

-- ============================================================================
-- Drop unused indexes - ai_usage_settings
-- ============================================================================

DROP INDEX IF EXISTS idx_ai_usage_settings_organization;

-- ============================================================================
-- Drop unused indexes - demo_reports
-- ============================================================================

DROP INDEX IF EXISTS idx_demo_reports_date;

-- ============================================================================
-- Drop unused indexes - demo_sessions
-- ============================================================================

DROP INDEX IF EXISTS idx_demo_sessions_token;
DROP INDEX IF EXISTS idx_demo_sessions_expires;
DROP INDEX IF EXISTS idx_demo_sessions_email;
DROP INDEX IF EXISTS idx_demo_sessions_ip_address;
DROP INDEX IF EXISTS idx_demo_sessions_email_expires;
DROP INDEX IF EXISTS idx_demo_sessions_ip_expires;
DROP INDEX IF EXISTS idx_demo_sessions_share_token;

-- ============================================================================
-- Drop unused indexes - demo_stores
-- ============================================================================

DROP INDEX IF EXISTS idx_demo_stores_brand;

-- ============================================================================
-- Drop unused indexes - demo_monthly_expenses
-- ============================================================================

DROP INDEX IF EXISTS idx_demo_monthly_expenses_org;

-- ============================================================================
-- Drop unused indexes - demo_ai_reports
-- ============================================================================

DROP INDEX IF EXISTS idx_demo_ai_reports_generated_at;
DROP INDEX IF EXISTS idx_demo_ai_reports_store;

-- ============================================================================
-- Drop unused indexes - organizations
-- ============================================================================

DROP INDEX IF EXISTS idx_organizations_demo_expires;
DROP INDEX IF EXISTS idx_organizations_subscription_status;

-- ============================================================================
-- Drop unused indexes - organization_members
-- ============================================================================

DROP INDEX IF EXISTS idx_organization_members_org;
DROP INDEX IF EXISTS idx_organization_members_store_id;
DROP INDEX IF EXISTS idx_organization_members_org_store;
DROP INDEX IF EXISTS idx_organization_members_role_user;

-- ============================================================================
-- Drop unused indexes - organization_invitations
-- ============================================================================

DROP INDEX IF EXISTS idx_organization_invitations_email;
DROP INDEX IF EXISTS idx_organization_invitations_token;
DROP INDEX IF EXISTS idx_organization_invitations_status;
DROP INDEX IF EXISTS idx_organization_invitations_expires_at;
DROP INDEX IF EXISTS idx_organization_invitations_invited_by;

-- ============================================================================
-- Drop unused indexes - organization_subscriptions
-- ============================================================================

DROP INDEX IF EXISTS idx_organization_subscriptions_plan_id;

-- ============================================================================
-- Drop unused indexes - usage_counters
-- ============================================================================

DROP INDEX IF EXISTS idx_usage_counters_org_period;
DROP INDEX IF EXISTS idx_usage_counters_kind;

-- ============================================================================
-- Drop unused indexes - audit_logs
-- ============================================================================

DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_resource;
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_status;
DROP INDEX IF EXISTS idx_audit_logs_org_action_created;
DROP INDEX IF EXISTS idx_audit_logs_org_user_created;

-- ============================================================================
-- Drop unused indexes - audit_logs_archive
-- ============================================================================

DROP INDEX IF EXISTS idx_audit_logs_archive_org_id;
DROP INDEX IF EXISTS idx_audit_logs_archive_created_at;

-- ============================================================================
-- Drop unused indexes - notifications
-- ============================================================================

DROP INDEX IF EXISTS idx_notifications_organization_id;
DROP INDEX IF EXISTS idx_notifications_read;
DROP INDEX IF EXISTS idx_notifications_created_at;
DROP INDEX IF EXISTS idx_notifications_user_unread;

-- ============================================================================
-- Drop unused indexes - admin_override_logs
-- ============================================================================

DROP INDEX IF EXISTS idx_admin_override_logs_org_store;
DROP INDEX IF EXISTS idx_admin_override_logs_created_at;
DROP INDEX IF EXISTS idx_admin_override_logs_admin_user_id;
DROP INDEX IF EXISTS idx_admin_override_logs_store_id_fk;

-- ============================================================================
-- Drop unused indexes - error_logs
-- ============================================================================

DROP INDEX IF EXISTS idx_error_logs_resolved_by;
DROP INDEX IF EXISTS idx_error_logs_created_at;
DROP INDEX IF EXISTS idx_error_logs_severity;
DROP INDEX IF EXISTS idx_error_logs_error_type;
DROP INDEX IF EXISTS idx_error_logs_organization_id;
DROP INDEX IF EXISTS idx_error_logs_user_id;
DROP INDEX IF EXISTS idx_error_logs_resolved;
DROP INDEX IF EXISTS idx_error_logs_org_created;
DROP INDEX IF EXISTS idx_error_logs_org_severity;

-- ============================================================================
-- Drop unused indexes - brands
-- ============================================================================

DROP INDEX IF EXISTS idx_brands_active;

-- ============================================================================
-- Drop unused indexes - expense_baselines
-- ============================================================================

DROP INDEX IF EXISTS idx_expense_baselines_organization;
