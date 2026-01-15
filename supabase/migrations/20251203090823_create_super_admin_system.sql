/*
  # スーパー管理者システムの構築

  ## 概要
  このマイグレーションは、組織を横断してシステム全体を管理できるスーパー管理者機能を実装します。
  サポート担当者や開発者が全組織のデータにアクセスし、トラブルシューティングを行えるようにします。

  ## 新規テーブル

  ### 1. system_admins
  スーパー管理者の権限を管理するテーブル
  - `user_id`: スーパー管理者のユーザーID (auth.users参照)
  - `granted_by`: 権限を付与したユーザーID
  - `granted_at`: 権限付与日時
  - `expires_at`: 権限の有効期限 (NULLの場合は無期限)
  - `permissions`: 詳細な権限設定 (JSONB)
  - `notes`: 付与理由などのメモ
  - `is_active`: アクティブフラグ
  
  ### 2. admin_activity_logs
  スーパー管理者のすべてのアクションを記録する監査ログ
  - `id`: ログID
  - `admin_user_id`: アクションを実行したスーパー管理者のID
  - `action`: 実行されたアクション種別
  - `target_table`: 対象テーブル名
  - `target_id`: 対象レコードのID
  - `target_organization_id`: 対象組織のID
  - `metadata`: 追加情報 (JSONB)
  - `ip_address`: IPアドレス
  - `user_agent`: ユーザーエージェント
  - `created_at`: 実行日時

  ## セキュリティ設計

  ### system_admins テーブル
  - ✅ service_role のみが INSERT/UPDATE/DELETE 可能
  - ✅ スーパー管理者本人は自分のレコードを SELECT 可能
  - ✅ 通常ユーザーは一切アクセス不可

  ### admin_activity_logs テーブル
  - ✅ スーパー管理者のみ SELECT 可能
  - ✅ INSERT は認証済みユーザーのみ可能（自動記録用）
  - ✅ 誰も UPDATE/DELETE できない（監査証跡の完全性保証）

  ## 権限の例

  ```json
  {
    "view_all_errors": true,          // 全組織のエラーログ閲覧
    "view_all_organizations": true,   // 全組織情報の閲覧
    "manage_subscriptions": true,     // サブスクリプション管理
    "manage_users": false,            // ユーザー管理（無効）
    "delete_data": false              // データ削除（無効）
  }
  ```

  ## 使用方法

  ### スーパー管理者の追加（service_roleで実行）
  ```sql
  INSERT INTO system_admins (user_id, granted_by, permissions, notes)
  VALUES (
    'user-uuid-here',
    'admin-uuid-here',
    '{"view_all_errors": true, "view_all_organizations": true}'::jsonb,
    '開発チームのテクニカルサポート担当'
  );
  ```

  ### スーパー管理者の一時停止
  ```sql
  UPDATE system_admins 
  SET is_active = false
  WHERE user_id = 'user-uuid-here';
  ```

  ### 監査ログの確認
  ```sql
  SELECT * FROM admin_activity_logs
  WHERE admin_user_id = 'user-uuid-here'
  ORDER BY created_at DESC
  LIMIT 100;
  ```
*/

-- system_admins テーブル作成
CREATE TABLE IF NOT EXISTS system_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz,
  permissions jsonb DEFAULT '{
    "view_all_errors": true,
    "view_all_organizations": true,
    "manage_subscriptions": false,
    "manage_users": false,
    "delete_data": false
  }'::jsonb NOT NULL,
  notes text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- admin_activity_logs テーブル作成
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  target_organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- インデックス作成（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_system_admins_active 
  ON system_admins(user_id) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_system_admins_expires 
  ON system_admins(expires_at) 
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_user 
  ON admin_activity_logs(admin_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_target_org 
  ON admin_activity_logs(target_organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at 
  ON admin_activity_logs(created_at DESC);

-- RLS有効化
ALTER TABLE system_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- system_admins の RLS ポリシー
-- 1. スーパー管理者本人は自分のレコードを閲覧可能
CREATE POLICY "Super admins can view their own record"
  ON system_admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. 他のスーパー管理者は全スーパー管理者リストを閲覧可能
CREATE POLICY "Super admins can view all system admins"
  ON system_admins
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins sa
      WHERE sa.user_id = auth.uid()
      AND sa.is_active = true
      AND (sa.expires_at IS NULL OR sa.expires_at > now())
    )
  );

-- 3. 誰も直接変更できない（service_roleのみ）
CREATE POLICY "No direct modification of system_admins"
  ON system_admins
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- admin_activity_logs の RLS ポリシー
-- 1. スーパー管理者は全監査ログを閲覧可能
CREATE POLICY "Super admins can view all activity logs"
  ON admin_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins sa
      WHERE sa.user_id = auth.uid()
      AND sa.is_active = true
      AND (sa.expires_at IS NULL OR sa.expires_at > now())
    )
  );

-- 2. 認証済みユーザーは監査ログを挿入可能（自動記録用）
CREATE POLICY "Authenticated users can insert activity logs"
  ON admin_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (admin_user_id = auth.uid());

-- 3. 誰も監査ログを更新・削除できない（完全性保証）
CREATE POLICY "Activity logs are immutable"
  ON admin_activity_logs
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Activity logs cannot be deleted"
  ON admin_activity_logs
  FOR DELETE
  TO authenticated
  USING (false);

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_system_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_admins_updated_at
  BEFORE UPDATE ON system_admins
  FOR EACH ROW
  EXECUTE FUNCTION update_system_admins_updated_at();

-- 監査ログ削除防止トリガー（service_roleでも削除不可）
CREATE OR REPLACE FUNCTION prevent_audit_log_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs cannot be deleted for compliance reasons';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_delete_audit_logs
  BEFORE DELETE ON admin_activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_deletion();

-- ヘルパー関数: ユーザーがアクティブなスーパー管理者かチェック
CREATE OR REPLACE FUNCTION is_super_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM system_admins
    WHERE system_admins.user_id = $1
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ヘルパー関数: スーパー管理者の権限をチェック
CREATE OR REPLACE FUNCTION has_super_admin_permission(user_id uuid, permission_name text)
RETURNS boolean AS $$
DECLARE
  perms jsonb;
BEGIN
  SELECT permissions INTO perms
  FROM system_admins
  WHERE system_admins.user_id = $1
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now());
  
  IF perms IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN COALESCE((perms->permission_name)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- コメント追加
COMMENT ON TABLE system_admins IS 'システム全体を管理できるスーパー管理者の権限テーブル。service_roleのみが変更可能。';
COMMENT ON TABLE admin_activity_logs IS 'スーパー管理者の全アクションを記録する不変の監査ログ。削除・更新不可。';
COMMENT ON COLUMN system_admins.permissions IS '権限の詳細設定（JSONB）。view_all_errors, view_all_organizations, manage_subscriptions, manage_users, delete_dataなど。';
COMMENT ON COLUMN admin_activity_logs.metadata IS 'アクションの詳細情報（JSONB）。変更内容、アクセスしたデータなどを記録。';
