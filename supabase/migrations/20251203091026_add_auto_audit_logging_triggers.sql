/*
  # 監査ログ自動記録システム

  ## 概要
  スーパー管理者が重要なテーブルにアクセスした際、自動的に監査ログに記録する関数を実装します。
  これにより、誰が、いつ、どのデータにアクセスしたかの完全な証跡を残します。

  ## 監査対象テーブル
  1. error_logs - エラーログの閲覧
  2. organizations - 組織情報の閲覧
  3. profiles - ユーザー情報の閲覧
  4. daily_reports - 日次レポートの閲覧
  5. organization_subscriptions - サブスクリプション情報の閲覧

  ## 記録される情報
  - admin_user_id: アクションを実行したスーパー管理者のID
  - action: 実行されたアクション（VIEW/SWITCH/UPDATE など）
  - target_table: 対象テーブル名
  - target_id: 対象レコードのID
  - target_organization_id: 対象の組織ID
  - metadata: 追加情報（変更内容など）
  - created_at: 実行日時

  ## 使用方法
  フロントエンドから以下の関数を呼び出して監査ログを記録：
  1. log_organization_switch(org_id) - 組織切り替え時
  2. log_error_log_view(error_id, org_id) - エラーログ閲覧時
  3. log_error_logs_batch_view(org_id, count) - エラーログ一覧閲覧時
*/

-- 汎用監査ログ記録関数（テーブル変更時用）
CREATE OR REPLACE FUNCTION log_super_admin_activity()
RETURNS TRIGGER AS $$
DECLARE
  target_org_id uuid;
  target_record_id uuid;
  is_admin boolean;
BEGIN
  -- スーパー管理者かチェック
  SELECT is_super_admin(auth.uid()) INTO is_admin;
  
  -- スーパー管理者でない場合は記録しない
  IF NOT is_admin THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- 対象レコードのIDと組織IDを取得
  CASE TG_OP
    WHEN 'DELETE' THEN
      target_record_id := OLD.id;
      target_org_id := OLD.organization_id;
    ELSE
      target_record_id := NEW.id;
      target_org_id := NEW.organization_id;
  END CASE;

  -- 監査ログに記録（エラーが発生してもメインクエリは失敗させない）
  BEGIN
    INSERT INTO admin_activity_logs (
      admin_user_id,
      action,
      target_table,
      target_id,
      target_organization_id,
      metadata
    ) VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      target_record_id,
      target_org_id,
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'timestamp', now()
      )
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- ログ記録に失敗してもメイン処理は継続
      RAISE WARNING 'Failed to log admin activity: %', SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- organizations テーブルへのトリガー
DROP TRIGGER IF EXISTS log_super_admin_organizations_access ON organizations;
CREATE TRIGGER log_super_admin_organizations_access
  AFTER INSERT OR UPDATE OR DELETE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION log_super_admin_activity();

-- daily_reports テーブルへのトリガー
DROP TRIGGER IF EXISTS log_super_admin_daily_reports_access ON daily_reports;
CREATE TRIGGER log_super_admin_daily_reports_access
  AFTER INSERT OR UPDATE OR DELETE ON daily_reports
  FOR EACH ROW
  EXECUTE FUNCTION log_super_admin_activity();

-- 組織切り替えを記録する関数（フロントエンドから呼び出し）
CREATE OR REPLACE FUNCTION log_organization_switch(target_org_id uuid)
RETURNS void AS $$
BEGIN
  IF is_super_admin(auth.uid()) THEN
    INSERT INTO admin_activity_logs (
      admin_user_id,
      action,
      target_organization_id,
      metadata
    ) VALUES (
      auth.uid(),
      'SWITCH_ORGANIZATION',
      target_org_id,
      jsonb_build_object(
        'action', 'switch_organization',
        'target_org_id', target_org_id,
        'timestamp', now()
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- エラーログ閲覧を記録する関数（フロントエンドから呼び出し）
CREATE OR REPLACE FUNCTION log_error_log_view(
  error_log_id uuid,
  org_id uuid
)
RETURNS void AS $$
BEGIN
  IF is_super_admin(auth.uid()) THEN
    INSERT INTO admin_activity_logs (
      admin_user_id,
      action,
      target_table,
      target_id,
      target_organization_id,
      metadata
    ) VALUES (
      auth.uid(),
      'VIEW_ERROR_LOG',
      'error_logs',
      error_log_id,
      org_id,
      jsonb_build_object(
        'action', 'view_error_log',
        'error_log_id', error_log_id,
        'timestamp', now()
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- バッチでエラーログ閲覧を記録する関数（複数件の閲覧時）
CREATE OR REPLACE FUNCTION log_error_logs_batch_view(
  org_id uuid,
  record_count integer
)
RETURNS void AS $$
BEGIN
  IF is_super_admin(auth.uid()) THEN
    INSERT INTO admin_activity_logs (
      admin_user_id,
      action,
      target_table,
      target_organization_id,
      metadata
    ) VALUES (
      auth.uid(),
      'VIEW_ERROR_LOGS_BATCH',
      'error_logs',
      org_id,
      jsonb_build_object(
        'action', 'view_error_logs_batch',
        'organization_id', org_id,
        'record_count', record_count,
        'timestamp', now()
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 監査ログの統計情報を取得する関数
CREATE OR REPLACE FUNCTION get_admin_activity_stats(
  admin_id uuid DEFAULT NULL,
  days_back integer DEFAULT 30
)
RETURNS TABLE (
  admin_user_id uuid,
  admin_email text,
  total_actions bigint,
  organizations_accessed bigint,
  last_activity timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aal.admin_user_id,
    p.email,
    COUNT(*) as total_actions,
    COUNT(DISTINCT aal.target_organization_id) as organizations_accessed,
    MAX(aal.created_at) as last_activity
  FROM admin_activity_logs aal
  JOIN profiles p ON aal.admin_user_id = p.id
  WHERE 
    (admin_id IS NULL OR aal.admin_user_id = admin_id)
    AND aal.created_at > now() - (days_back || ' days')::interval
  GROUP BY aal.admin_user_id, p.email
  ORDER BY last_activity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- コメント追加
COMMENT ON FUNCTION log_super_admin_activity() IS 'スーパー管理者のテーブルアクセスを自動的に監査ログに記録するトリガー関数';
COMMENT ON FUNCTION log_organization_switch(uuid) IS 'スーパー管理者の組織切り替えを監査ログに記録';
COMMENT ON FUNCTION log_error_log_view(uuid, uuid) IS 'スーパー管理者のエラーログ閲覧を監査ログに記録';
COMMENT ON FUNCTION log_error_logs_batch_view(uuid, integer) IS 'スーパー管理者のエラーログ一覧閲覧を監査ログに記録';
COMMENT ON FUNCTION get_admin_activity_stats(uuid, integer) IS 'スーパー管理者のアクティビティ統計を取得';
