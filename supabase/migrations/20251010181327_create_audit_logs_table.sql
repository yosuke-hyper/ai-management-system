/*
  # 監査ログテーブルの作成

  ## 概要
  セキュリティとコンプライアンスのため、重要な操作を記録する監査ログ機能を実装します。

  ## 新規テーブル
  - audit_logs - 監査ログを保存

  ## テーブル構造
  - id (uuid, primary key) - ログID
  - organization_id (uuid, foreign key) - 組織ID
  - user_id (uuid, foreign key) - 操作実行ユーザーID
  - action (text) - 操作アクション（例: user.created, store.updated）
  - resource_type (text) - リソースタイプ（例: user, store, report）
  - resource_id (text) - リソースID
  - details (jsonb) - 詳細情報（変更前後の値など）
  - ip_address (text) - IPアドレス
  - user_agent (text) - ユーザーエージェント
  - status (text) - 操作結果（success, failure）
  - error_message (text) - エラーメッセージ（失敗時）
  - created_at (timestamptz) - 作成日時

  ## セキュリティ
  - RLSポリシーで組織の管理者のみが閲覧可能
  - ログは削除不可（SELECT, INSERTのみ）
*/

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CHECK (status IN ('success', 'failure'))
);

COMMENT ON TABLE public.audit_logs IS '監査ログ - 重要な操作を記録';
COMMENT ON COLUMN public.audit_logs.action IS '操作アクション（例: user.created, store.updated, report.deleted）';
COMMENT ON COLUMN public.audit_logs.resource_type IS 'リソースタイプ（例: user, store, report, organization）';
COMMENT ON COLUMN public.audit_logs.resource_id IS 'リソースの一意識別子';
COMMENT ON COLUMN public.audit_logs.details IS '詳細情報（変更前後の値、追加コンテキストなど）';
COMMENT ON COLUMN public.audit_logs.status IS '操作結果（success, failure）';

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id 
  ON public.audit_logs(organization_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
  ON public.audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
  ON public.audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource 
  ON public.audit_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
  ON public.audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_status 
  ON public.audit_logs(status);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = audit_logs.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = audit_logs.organization_id
        AND organization_members.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_organization_id uuid,
  p_user_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_status text DEFAULT 'success',
  p_error_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent,
    status,
    error_message
  ) VALUES (
    p_organization_id,
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    p_ip_address,
    p_user_agent,
    p_status,
    p_error_message
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION public.create_audit_log IS '監査ログを作成するヘルパー関数';
