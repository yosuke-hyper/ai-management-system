/*
  # Add missing foreign key indexes

  ## 概要
  外部キー制約があるがインデックスが存在しないカラムにインデックスを追加して、クエリパフォーマンスを向上させます。

  ## 変更内容
  37個の外部キーカラムにインデックスを追加します。

  ## パフォーマンス改善
  外部キー参照のクエリが大幅に高速化されます。
*/

-- admin_override_logs
CREATE INDEX IF NOT EXISTS idx_admin_override_logs_admin_user_id ON admin_override_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_override_logs_organization_id ON admin_override_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_admin_override_logs_store_id ON admin_override_logs(store_id);

-- ai_conversations
CREATE INDEX IF NOT EXISTS idx_ai_conversations_demo_session_id ON ai_conversations(demo_session_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_organization_id ON ai_conversations(organization_id);

-- ai_generated_reports
CREATE INDEX IF NOT EXISTS idx_ai_generated_reports_organization_id ON ai_generated_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_reports_store_id ON ai_generated_reports(store_id);

-- ai_messages
CREATE INDEX IF NOT EXISTS idx_ai_messages_organization_id ON ai_messages(organization_id);

-- ai_usage_tracking
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_store_id ON ai_usage_tracking(store_id);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- daily_report_vendor_purchases
CREATE INDEX IF NOT EXISTS idx_daily_report_vendor_purchases_organization_id ON daily_report_vendor_purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_daily_report_vendor_purchases_vendor_id ON daily_report_vendor_purchases(vendor_id);

-- daily_reports
CREATE INDEX IF NOT EXISTS idx_daily_reports_organization_id ON daily_reports(organization_id);

-- daily_targets
CREATE INDEX IF NOT EXISTS idx_daily_targets_organization_id ON daily_targets(organization_id);

-- demo_monthly_expenses
CREATE INDEX IF NOT EXISTS idx_demo_monthly_expenses_demo_org_id ON demo_monthly_expenses(demo_org_id);

-- demo_stores
CREATE INDEX IF NOT EXISTS idx_demo_stores_brand_id ON demo_stores(brand_id);

-- error_logs
CREATE INDEX IF NOT EXISTS idx_error_logs_organization_id ON error_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved_by ON error_logs(resolved_by);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);

-- expense_baselines
CREATE INDEX IF NOT EXISTS idx_expense_baselines_organization_id ON expense_baselines(organization_id);

-- fixed_demo_stores
CREATE INDEX IF NOT EXISTS idx_fixed_demo_stores_brand_id ON fixed_demo_stores(brand_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);

-- organization_invitations
CREATE INDEX IF NOT EXISTS idx_organization_invitations_invited_by ON organization_invitations(invited_by);

-- organization_members
CREATE INDEX IF NOT EXISTS idx_organization_members_store_id ON organization_members(store_id);

-- organization_subscriptions
CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_plan_id ON organization_subscriptions(plan_id);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);

-- report_generation_logs
CREATE INDEX IF NOT EXISTS idx_report_generation_logs_organization_id ON report_generation_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_generation_logs_report_id ON report_generation_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_report_generation_logs_schedule_id ON report_generation_logs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_report_generation_logs_store_id ON report_generation_logs(store_id);

-- report_schedules
CREATE INDEX IF NOT EXISTS idx_report_schedules_store_id ON report_schedules(store_id);

-- store_assignments
CREATE INDEX IF NOT EXISTS idx_store_assignments_organization_id ON store_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_store_assignments_store_id ON store_assignments(store_id);

-- store_vendor_assignments
CREATE INDEX IF NOT EXISTS idx_store_vendor_assignments_vendor_id ON store_vendor_assignments(vendor_id);

-- stores
CREATE INDEX IF NOT EXISTS idx_stores_brand_id ON stores(brand_id);
CREATE INDEX IF NOT EXISTS idx_stores_manager_id ON stores(manager_id);

-- summary_data
CREATE INDEX IF NOT EXISTS idx_summary_data_store_id ON summary_data(store_id);
