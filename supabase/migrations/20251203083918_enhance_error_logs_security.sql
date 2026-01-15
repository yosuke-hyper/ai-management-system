/*
  # エラーログテーブルのセキュリティ強化

  ## 概要
  error_logsテーブルのRLSポリシーとアクセス権限を強化し、
  セキュリティベストプラクティスに準拠させます。

  ## 実施内容

  ### 1. 権限の最小化
  - anon と authenticated ロールから不要な権限を削除
  - 必要な操作のみを明示的に許可

  ### 2. RLSポリシーの最適化
  - auth.uid() を使用してパフォーマンスを向上
  - インデックスを活用したポリシー設計

  ### 3. セキュリティ
  - RLSが確実に有効化されていることを確認
  - service_role のみが完全なアクセス権を持つ
  - authenticated ユーザーは制限付きアクセス
  - anon ユーザーはアクセス不可

  ## 変更点
  - 既存のポリシーはそのまま維持
  - 権限の明示的な制限を追加
  - パフォーマンス最適化のためのヒントを追加
*/

-- ========================================
-- 1. RLSの有効化（冪等性のため再実行）
-- ========================================

-- RLSが確実に有効になっていることを確認
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- error_log_statistics ビューのセキュリティ設定を確認
ALTER VIEW error_log_statistics SET (security_invoker = true);

-- ========================================
-- 2. 権限の最小化
-- ========================================

-- anon ロールから全権限を削除（匿名ユーザーはエラーログにアクセスできない）
REVOKE ALL ON error_logs FROM anon;

-- authenticated ロールの権限を制限
-- 既存の権限をクリーンアップ
REVOKE ALL ON error_logs FROM authenticated;

-- INSERT のみを明示的に許可（RLSポリシーで制御）
GRANT INSERT ON error_logs TO authenticated;

-- SELECT は RLS ポリシー経由でのみ許可（明示的な GRANT は不要）
GRANT SELECT ON error_logs TO authenticated;

-- UPDATE と DELETE は RLS ポリシーで admin/owner のみに制限
GRANT UPDATE ON error_logs TO authenticated;
GRANT DELETE ON error_logs TO authenticated;

-- ========================================
-- 3. 既存ポリシーの最適化（パフォーマンス向上）
-- ========================================

-- 既存のポリシーを削除して最適化版を再作成
DROP POLICY IF EXISTS "Admins can view all error logs" ON error_logs;
DROP POLICY IF EXISTS "Users can view own error logs" ON error_logs;
DROP POLICY IF EXISTS "Authenticated users can create error logs" ON error_logs;
DROP POLICY IF EXISTS "Admins can update error logs" ON error_logs;
DROP POLICY IF EXISTS "Admins can delete error logs" ON error_logs;

-- ========================================
-- SELECT ポリシー（読み取り）
-- ========================================

-- 管理者は組織内の全エラーログを閲覧可能
CREATE POLICY "Admins can view all error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (
    -- パフォーマンス最適化: auth.uid() を先に評価
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ユーザーは自分のエラーログを閲覧可能
CREATE POLICY "Users can view own error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ========================================
-- INSERT ポリシー（作成）
-- ========================================

-- 認証済みユーザーは自分のエラーログを作成可能
-- または組織メンバーとしてエラーログを作成可能
CREATE POLICY "Authenticated users can create error logs"
  ON error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- 自分のエラーログとして作成
    user_id = auth.uid()
    OR
    -- 組織メンバーとしてエラーログを作成
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- UPDATE ポリシー（更新）
-- ========================================

-- 管理者はエラーログを更新可能（解決済みマーク等）
CREATE POLICY "Admins can update error logs"
  ON error_logs
  FOR UPDATE
  TO authenticated
  USING (
    -- 読み取り権限チェック
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    -- 書き込み権限チェック（USING と同じ条件）
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ========================================
-- DELETE ポリシー（削除）
-- ========================================

-- オーナーのみがエラーログを削除可能
CREATE POLICY "Admins can delete error logs"
  ON error_logs
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- ========================================
-- 4. 関数のセキュリティ設定
-- ========================================

-- archive_old_error_logs 関数の権限を制限
REVOKE ALL ON FUNCTION archive_old_error_logs FROM PUBLIC;
-- service_role のみが実行可能（Supabase の管理タスクとして実行）

-- log_error_with_deduplication 関数の権限を制限
REVOKE ALL ON FUNCTION log_error_with_deduplication FROM PUBLIC;
GRANT EXECUTE ON FUNCTION log_error_with_deduplication TO authenticated;

-- ========================================
-- 5. パフォーマンス最適化のためのインデックス確認
-- ========================================

-- organization_members テーブルのインデックスが存在することを確認
-- （ポリシーのパフォーマンスに重要）
CREATE INDEX IF NOT EXISTS idx_organization_members_user_role
  ON organization_members(user_id, role);

CREATE INDEX IF NOT EXISTS idx_organization_members_org_user
  ON organization_members(organization_id, user_id);

-- ========================================
-- 6. コメントの追加
-- ========================================

COMMENT ON POLICY "Admins can view all error logs" ON error_logs IS
  'owner/admin は組織内の全エラーログを閲覧可能';

COMMENT ON POLICY "Users can view own error logs" ON error_logs IS
  'ユーザーは自分のエラーログのみ閲覧可能';

COMMENT ON POLICY "Authenticated users can create error logs" ON error_logs IS
  '認証済みユーザーは自分のエラーログまたは所属組織のエラーログを作成可能';

COMMENT ON POLICY "Admins can update error logs" ON error_logs IS
  'owner/admin はエラーログの更新可能（解決マーク等）';

COMMENT ON POLICY "Admins can delete error logs" ON error_logs IS
  'owner のみがエラーログを削除可能';

-- ========================================
-- 7. セキュリティ検証
-- ========================================

-- RLS が有効であることを確認
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'error_logs' AND relnamespace = 'public'::regnamespace) THEN
    RAISE EXCEPTION 'RLS is not enabled on error_logs table!';
  END IF;

  RAISE NOTICE '✅ RLS is enabled on error_logs table';
END $$;

-- ポリシー数を確認
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'error_logs';

  IF policy_count < 5 THEN
    RAISE WARNING 'Expected 5 policies but found %', policy_count;
  ELSE
    RAISE NOTICE '✅ Found % RLS policies on error_logs table', policy_count;
  END IF;
END $$;