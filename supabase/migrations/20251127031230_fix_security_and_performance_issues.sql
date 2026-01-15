/*
  # セキュリティとパフォーマンスの問題修正

  ## 概要
  Supabaseのセキュリティアドバイザーで検出された問題を修正します。

  ## 修正内容

  ### 1. 外部キーインデックスの追加（9個）
  - admin_override_logs: admin_user_id, store_id
  - error_logs: resolved_by
  - organization_invitations: invited_by
  - organization_subscriptions: plan_id
  - report_generation_logs: report_id, schedule_id, store_id
  - report_schedules: store_id

  ### 2. 重複インデックスの削除
  - 同一機能を持つインデックスを統合

  ### 3. バックアップテーブルの削除
  - ai_usage_settings_backup テーブルの削除
*/

-- ==========================================
-- 1. 外部キーインデックスの追加
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_admin_override_logs_admin_user_id
  ON admin_override_logs(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_override_logs_store_id_fk
  ON admin_override_logs(store_id);

CREATE INDEX IF NOT EXISTS idx_error_logs_resolved_by
  ON error_logs(resolved_by);

CREATE INDEX IF NOT EXISTS idx_organization_invitations_invited_by
  ON organization_invitations(invited_by);

CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_plan_id
  ON organization_subscriptions(plan_id);

CREATE INDEX IF NOT EXISTS idx_report_generation_logs_report_id_fk
  ON report_generation_logs(report_id);

CREATE INDEX IF NOT EXISTS idx_report_generation_logs_schedule_id_fk
  ON report_generation_logs(schedule_id);

CREATE INDEX IF NOT EXISTS idx_report_generation_logs_store_id_fk
  ON report_generation_logs(store_id);

CREATE INDEX IF NOT EXISTS idx_report_schedules_store_id_fk
  ON report_schedules(store_id);

-- ==========================================
-- 2. 重複インデックスの削除
-- ==========================================

DROP INDEX IF EXISTS idx_drv_purchases_report;
DROP INDEX IF EXISTS idx_vendor_purchases_report;
DROP INDEX IF EXISTS idx_vendor_purchases_vendor;
DROP INDEX IF EXISTS idx_monthly_expenses_store_month;
DROP INDEX IF EXISTS idx_organization_members_user_id;
DROP INDEX IF EXISTS idx_profiles_email;
DROP INDEX IF EXISTS idx_profiles_role;
DROP INDEX IF EXISTS uniq_profiles_email;
DROP INDEX IF EXISTS idx_store_assignments_store;
DROP INDEX IF EXISTS idx_store_assignments_user;
DROP INDEX IF EXISTS uniq_store_assignment;
DROP INDEX IF EXISTS idx_store_vendor_vendor;
DROP INDEX IF EXISTS uniq_store_vendor;

-- ==========================================
-- 3. バックアップテーブルの削除
-- ==========================================

DROP TABLE IF EXISTS ai_usage_settings_backup CASCADE;