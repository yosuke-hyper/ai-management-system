/*
  # エラーログテーブルの作成

  ## 概要
  アプリケーションで発生したエラーを記録するためのテーブルを作成します。
  これにより、エラーの追跡、分析、トラブルシューティングが容易になります。

  ## 新規テーブル
  
  ### `error_logs`
  - `id` (uuid, primary key) - エラーログID
  - `organization_id` (uuid) - 組織ID（マルチテナント対応）
  - `user_id` (uuid) - ユーザーID
  - `error_type` (text) - エラータイプ（AUTHENTICATION, DATABASE, VALIDATION等）
  - `error_message` (text) - エラーメッセージ
  - `severity` (text) - 深刻度（LOW, MEDIUM, HIGH, CRITICAL）
  - `stack_trace` (text) - スタックトレース
  - `context` (jsonb) - コンテキスト情報（任意のメタデータ）
  - `user_agent` (text) - ユーザーエージェント
  - `url` (text) - エラー発生時のURL
  - `ip_address` (inet) - IPアドレス
  - `resolved` (boolean) - 解決済みフラグ
  - `resolved_at` (timestamptz) - 解決日時
  - `resolved_by` (uuid) - 解決者のユーザーID
  - `notes` (text) - 管理者メモ
  - `created_at` (timestamptz) - 作成日時

  ## セキュリティ
  - RLSを有効化
  - 管理者のみが全エラーログを閲覧可能
  - ユーザーは自分のエラーログのみ閲覧可能
  - エラーログの作成は認証済みユーザーとシステムのみ可能

  ## パフォーマンス
  - timestamp、severity、error_type、organization_idにインデックスを作成
  - 古いログの自動アーカイブ機能（オプション）
*/

-- エラーログテーブルの作成
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type text NOT NULL,
  error_message text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  stack_trace text,
  context jsonb DEFAULT '{}'::jsonb,
  user_agent text,
  url text,
  ip_address inet,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- インデックスの作成（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity) WHERE NOT resolved;
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_organization_id ON error_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

-- 複合インデックス（よくある検索パターンに対応）
CREATE INDEX IF NOT EXISTS idx_error_logs_org_created ON error_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_org_severity ON error_logs(organization_id, severity) WHERE NOT resolved;

-- RLSの有効化
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 管理者は全エラーログを閲覧可能
CREATE POLICY "Admins can view all error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.organization_id = error_logs.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- RLSポリシー: ユーザーは自分のエラーログを閲覧可能
CREATE POLICY "Users can view own error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLSポリシー: システムとして認証済みユーザーはエラーログを作成可能
CREATE POLICY "Authenticated users can create error logs"
  ON error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.organization_id = error_logs.organization_id
    )
  );

-- RLSポリシー: 管理者はエラーログを更新可能（解決済みマーク等）
CREATE POLICY "Admins can update error logs"
  ON error_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.organization_id = error_logs.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.organization_id = error_logs.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- RLSポリシー: 管理者はエラーログを削除可能
CREATE POLICY "Admins can delete error logs"
  ON error_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.organization_id = error_logs.organization_id
      AND organization_members.role = 'owner'
    )
  );

-- エラーログ統計ビューの作成（管理者向け）
CREATE OR REPLACE VIEW error_log_statistics AS
SELECT
  organization_id,
  DATE(created_at) as date,
  error_type,
  severity,
  COUNT(*) as error_count,
  COUNT(*) FILTER (WHERE resolved) as resolved_count,
  COUNT(*) FILTER (WHERE NOT resolved) as unresolved_count
FROM error_logs
GROUP BY organization_id, DATE(created_at), error_type, severity;

-- ビューのRLS
ALTER VIEW error_log_statistics SET (security_invoker = true);

-- 古いエラーログを自動的にアーカイブする関数（オプション）
CREATE OR REPLACE FUNCTION archive_old_error_logs(days_to_keep integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  archived_count integer;
BEGIN
  -- 90日以上前の解決済みエラーログを削除
  DELETE FROM error_logs
  WHERE resolved = true
  AND created_at < NOW() - (days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  RETURN archived_count;
END;
$$;

-- エラーログの重複を防ぐための関数
CREATE OR REPLACE FUNCTION log_error_with_deduplication(
  p_organization_id uuid,
  p_user_id uuid,
  p_error_type text,
  p_error_message text,
  p_severity text,
  p_stack_trace text DEFAULT NULL,
  p_context jsonb DEFAULT '{}'::jsonb,
  p_user_agent text DEFAULT NULL,
  p_url text DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  deduplication_window interval DEFAULT '5 minutes'::interval
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_error_id uuid;
  v_existing_error_id uuid;
BEGIN
  -- 同じエラーが直近5分以内に記録されているかチェック
  SELECT id INTO v_existing_error_id
  FROM error_logs
  WHERE organization_id = p_organization_id
  AND user_id = p_user_id
  AND error_type = p_error_type
  AND error_message = p_error_message
  AND created_at > NOW() - deduplication_window
  ORDER BY created_at DESC
  LIMIT 1;

  -- 既存のエラーがある場合はそのIDを返す
  IF v_existing_error_id IS NOT NULL THEN
    RETURN v_existing_error_id;
  END IF;

  -- 新規エラーログを作成
  INSERT INTO error_logs (
    organization_id,
    user_id,
    error_type,
    error_message,
    severity,
    stack_trace,
    context,
    user_agent,
    url,
    ip_address
  ) VALUES (
    p_organization_id,
    p_user_id,
    p_error_type,
    p_error_message,
    p_severity,
    p_stack_trace,
    p_context,
    p_user_agent,
    p_url,
    p_ip_address
  )
  RETURNING id INTO v_error_id;

  RETURN v_error_id;
END;
$$;

-- コメントの追加（ドキュメント化）
COMMENT ON TABLE error_logs IS 'アプリケーションエラーログテーブル - エラーの追跡と分析に使用';
COMMENT ON COLUMN error_logs.error_type IS 'エラータイプ: AUTHENTICATION, DATABASE, VALIDATION等';
COMMENT ON COLUMN error_logs.severity IS '深刻度: LOW, MEDIUM, HIGH, CRITICAL';
COMMENT ON COLUMN error_logs.context IS 'エラーのコンテキスト情報（JSON形式）';
COMMENT ON COLUMN error_logs.resolved IS 'エラーが解決済みかどうか';
COMMENT ON FUNCTION archive_old_error_logs IS '指定日数より古い解決済みエラーログを削除';
COMMENT ON FUNCTION log_error_with_deduplication IS '重複チェック付きでエラーログを記録';
