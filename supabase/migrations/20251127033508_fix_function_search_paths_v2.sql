/*
  # Fix function search paths

  ## 概要
  すべての関数のsearch_pathを固定して、セキュリティリスクを軽減します。

  ## 変更内容
  role mutableなsearch_pathを持つすべての関数のsearch_pathを明示的に設定します。
  
  ## 対象関数
  public schema内のすべてのユーザー定義関数
*/

-- Set search_path for all user-defined functions
ALTER FUNCTION auto_accept_terms_on_profile_creation() SET search_path = public, pg_temp;
ALTER FUNCTION update_brands_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION increment_usage_counter(uuid, text, bigint) SET search_path = public, pg_temp;
ALTER FUNCTION insert_sample_brands(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION get_user_organization_id() SET search_path = public, pg_temp;
ALTER FUNCTION is_organization_owner(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION enforce_demo_quota() SET search_path = public, pg_temp;
ALTER FUNCTION purge_expired_demos() SET search_path = public, pg_temp;
ALTER FUNCTION get_user_role_in_organization(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION is_organization_manager(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION is_organization_admin(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION archive_old_audit_logs() SET search_path = public, pg_temp;
ALTER FUNCTION get_demo_status() SET search_path = public, pg_temp;
ALTER FUNCTION create_default_audit_log_settings() SET search_path = public, pg_temp;
ALTER FUNCTION expire_old_invitations() SET search_path = public, pg_temp;
ALTER FUNCTION handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION archive_old_error_logs(integer) SET search_path = public, pg_temp;
ALTER FUNCTION log_error_with_deduplication(uuid, uuid, text, text, text, text, jsonb, text, text, inet, interval) SET search_path = public, pg_temp;
ALTER FUNCTION create_audit_log(uuid, uuid, text, text, text, jsonb, text, text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION cleanup_expired_demo_sessions() SET search_path = public, pg_temp;
ALTER FUNCTION update_demo_ai_usage_timestamp() SET search_path = public, pg_temp;
ALTER FUNCTION check_demo_ai_usage(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION accept_terms_and_privacy(uuid, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION increment_demo_ai_usage(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION get_demo_ai_usage_status(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION delete_expired_notifications() SET search_path = public, pg_temp;
ALTER FUNCTION create_notification(uuid, uuid, text, text, text, text, integer) SET search_path = public, pg_temp;
ALTER FUNCTION get_store_usage_status(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION admin_override_store_limit(uuid, uuid, integer, text, boolean) SET search_path = public, pg_temp;
ALTER FUNCTION reset_store_monthly_usage(uuid, uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION create_organization_for_new_profile() SET search_path = public, pg_temp;
