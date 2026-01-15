/*
  # error_logs テーブルへのスーパー管理者アクセス権限追加

  ## 概要
  スーパー管理者が全組織のエラーログを閲覧できるようにRLSポリシーを拡張します。
  既存の組織管理者向けポリシーはそのまま維持し、スーパー管理者用のポリシーを追加します。

  ## 変更内容

  ### 1. 新しいRLSポリシー
  - スーパー管理者は全組織のエラーログを閲覧可能
  - 権限チェックは system_admins テーブルを参照
  - is_active = true かつ有効期限内のスーパー管理者のみ

  ### 2. 他のテーブルへの拡張
  - organizations: スーパー管理者が全組織情報を閲覧可能
  - profiles: スーパー管理者が全ユーザー情報を閲覧可能
  - organization_members: スーパー管理者が全メンバー情報を閲覧可能

  ## セキュリティ
  - ✅ 閲覧のみ許可（INSERT/UPDATE/DELETEは不可）
  - ✅ アクティブなスーパー管理者のみ
  - ✅ 有効期限チェック
  - ✅ 既存ポリシーへの影響なし

  ## 使用例
  ```sql
  -- スーパー管理者として全組織のエラーログを確認
  SELECT 
    el.*,
    o.name as organization_name,
    p.email as user_email
  FROM error_logs el
  LEFT JOIN organizations o ON el.organization_id = o.id
  LEFT JOIN profiles p ON el.user_id = p.id
  WHERE el.severity = 'CRITICAL'
  ORDER BY el.created_at DESC;
  ```
*/

-- error_logs: スーパー管理者が全エラーログを閲覧可能
CREATE POLICY "Super admins can view all error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins sa
      WHERE sa.user_id = auth.uid()
      AND sa.is_active = true
      AND (sa.expires_at IS NULL OR sa.expires_at > now())
      AND (sa.permissions->>'view_all_errors')::boolean = true
    )
  );

-- organizations: スーパー管理者が全組織情報を閲覧可能
CREATE POLICY "Super admins can view all organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins sa
      WHERE sa.user_id = auth.uid()
      AND sa.is_active = true
      AND (sa.expires_at IS NULL OR sa.expires_at > now())
      AND (sa.permissions->>'view_all_organizations')::boolean = true
    )
  );

-- profiles: スーパー管理者が全ユーザー情報を閲覧可能
CREATE POLICY "Super admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins sa
      WHERE sa.user_id = auth.uid()
      AND sa.is_active = true
      AND (sa.expires_at IS NULL OR sa.expires_at > now())
      AND (sa.permissions->>'view_all_organizations')::boolean = true
    )
  );

-- organization_members: スーパー管理者が全メンバー情報を閲覧可能
CREATE POLICY "Super admins can view all organization members"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins sa
      WHERE sa.user_id = auth.uid()
      AND sa.is_active = true
      AND (sa.expires_at IS NULL OR sa.expires_at > now())
      AND (sa.permissions->>'view_all_organizations')::boolean = true
    )
  );

-- stores: スーパー管理者が全店舗情報を閲覧可能
CREATE POLICY "Super admins can view all stores"
  ON stores
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins sa
      WHERE sa.user_id = auth.uid()
      AND sa.is_active = true
      AND (sa.expires_at IS NULL OR sa.expires_at > now())
      AND (sa.permissions->>'view_all_organizations')::boolean = true
    )
  );

-- daily_reports: スーパー管理者が全日次レポートを閲覧可能
CREATE POLICY "Super admins can view all daily reports"
  ON daily_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins sa
      WHERE sa.user_id = auth.uid()
      AND sa.is_active = true
      AND (sa.expires_at IS NULL OR sa.expires_at > now())
      AND (sa.permissions->>'view_all_organizations')::boolean = true
    )
  );

-- organization_subscriptions: スーパー管理者が全サブスクリプション情報を閲覧可能
CREATE POLICY "Super admins can view all subscriptions"
  ON organization_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins sa
      WHERE sa.user_id = auth.uid()
      AND sa.is_active = true
      AND (sa.expires_at IS NULL OR sa.expires_at > now())
      AND (sa.permissions->>'manage_subscriptions')::boolean = true
    )
  );

-- コメント追加
COMMENT ON POLICY "Super admins can view all error logs" ON error_logs IS 'スーパー管理者は全組織のエラーログを閲覧可能（view_all_errors権限が必要）';
COMMENT ON POLICY "Super admins can view all organizations" ON organizations IS 'スーパー管理者は全組織情報を閲覧可能（view_all_organizations権限が必要）';
COMMENT ON POLICY "Super admins can view all profiles" ON profiles IS 'スーパー管理者は全ユーザー情報を閲覧可能（view_all_organizations権限が必要）';
