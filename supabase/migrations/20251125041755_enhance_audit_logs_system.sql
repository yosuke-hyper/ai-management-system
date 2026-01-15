/*
  # 監査ログシステムの強化

  ## 変更内容
  1. 監査ログの自動アーカイブ機能を追加
  2. 組織ごとにログ保持期間を設定可能に
  3. 古いログを自動的にアーカイブ用テーブルに移動
  4. 検索パフォーマンスを向上させるための複合インデックスを追加

  ## 新規テーブル
  - audit_logs_archive - アーカイブされた監査ログ
  - audit_log_settings - 組織ごとの監査ログ設定

  ## 設定項目
  - retention_days: ログ保持日数（デフォルト: 365日）
  - auto_archive_enabled: 自動アーカイブ有効/無効
  - archive_to_cold_storage: コールドストレージへのアーカイブ
*/

-- 監査ログ設定テーブル
CREATE TABLE IF NOT EXISTS public.audit_log_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  retention_days integer NOT NULL DEFAULT 365,
  auto_archive_enabled boolean NOT NULL DEFAULT true,
  archive_to_cold_storage boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CHECK (retention_days >= 30 AND retention_days <= 3650)
);

COMMENT ON TABLE public.audit_log_settings IS '組織ごとの監査ログ設定';
COMMENT ON COLUMN public.audit_log_settings.retention_days IS 'ログ保持日数（30日〜3650日）';
COMMENT ON COLUMN public.audit_log_settings.auto_archive_enabled IS '自動アーカイブ機能の有効/無効';

-- アーカイブ用テーブル
CREATE TABLE IF NOT EXISTS public.audit_logs_archive (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  user_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  status text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_logs_archive IS 'アーカイブされた監査ログ';

CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_org_id 
  ON public.audit_logs_archive(organization_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_created_at 
  ON public.audit_logs_archive(created_at DESC);

-- 複合インデックスの追加（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_action_created 
  ON public.audit_logs(organization_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_resource_created 
  ON public.audit_logs(organization_id, resource_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_user_created 
  ON public.audit_logs(organization_id, user_id, created_at DESC) 
  WHERE user_id IS NOT NULL;

-- RLSポリシー
ALTER TABLE public.audit_log_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization admins can view audit log settings"
  ON public.audit_log_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = audit_log_settings.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Organization owners can update audit log settings"
  ON public.audit_log_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = audit_log_settings.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = audit_log_settings.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'owner'
    )
  );

CREATE POLICY "Organization admins can view archived audit logs"
  ON public.audit_logs_archive
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = audit_logs_archive.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'owner')
    )
  );

-- 古いログをアーカイブする関数
CREATE OR REPLACE FUNCTION public.archive_old_audit_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_archived_count integer := 0;
  v_org_record RECORD;
BEGIN
  -- 各組織の設定に基づいてアーカイブ
  FOR v_org_record IN
    SELECT 
      als.organization_id,
      als.retention_days,
      als.auto_archive_enabled
    FROM public.audit_log_settings als
    WHERE als.auto_archive_enabled = true
  LOOP
    -- 古いログをアーカイブテーブルに移動
    WITH archived AS (
      INSERT INTO public.audit_logs_archive
      SELECT 
        id,
        organization_id,
        user_id,
        action,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent,
        status,
        error_message,
        created_at,
        now() as archived_at
      FROM public.audit_logs
      WHERE organization_id = v_org_record.organization_id
        AND created_at < (now() - (v_org_record.retention_days || ' days')::interval)
      RETURNING id
    ),
    deleted AS (
      DELETE FROM public.audit_logs
      WHERE id IN (SELECT id FROM archived)
      RETURNING id
    )
    SELECT COUNT(*) INTO v_archived_count FROM deleted;
    
  END LOOP;

  RETURN v_archived_count;
END;
$$;

COMMENT ON FUNCTION public.archive_old_audit_logs IS '保持期間を過ぎた監査ログをアーカイブ';

-- デフォルト設定を作成するトリガー関数
CREATE OR REPLACE FUNCTION public.create_default_audit_log_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_log_settings (organization_id)
  VALUES (NEW.id)
  ON CONFLICT (organization_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 組織作成時に自動的に監査ログ設定を作成
DROP TRIGGER IF EXISTS create_audit_log_settings_trigger ON public.organizations;
CREATE TRIGGER create_audit_log_settings_trigger
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_audit_log_settings();

-- 既存の組織にデフォルト設定を作成
INSERT INTO public.audit_log_settings (organization_id)
SELECT id FROM public.organizations
WHERE id NOT IN (SELECT organization_id FROM public.audit_log_settings)
ON CONFLICT (organization_id) DO NOTHING;
