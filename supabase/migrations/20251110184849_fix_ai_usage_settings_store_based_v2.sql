/*
  # AI使用設定を店舗ベースに修正 v2

  ## 変更内容

  1. ai_usage_settings テーブルの修正
    - role カラムを削除
    - store_id カラムを追加
    - organization_id と store_id の複合ユニーク制約

  2. admin_override_logs テーブルを作成
    - 管理者による上限オーバーライドの履歴

  3. RPC関数の作成
    - get_store_usage_status: 店舗ごとの使用状況を取得
    - admin_override_store_limit: 管理者が店舗の上限を増加
    - reset_store_monthly_usage: 管理者が店舗の使用回数をリセット

  4. セキュリティ
    - RLS有効化
    - 適切なポリシー設定
*/

-- ============================================
-- 1. ai_usage_settings テーブルを店舗ベースに変更
-- ============================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view own org ai usage settings" ON ai_usage_settings;
DROP POLICY IF EXISTS "Admins can update own org ai usage settings" ON ai_usage_settings;
DROP POLICY IF EXISTS "Admins can insert own org ai usage settings" ON ai_usage_settings;
DROP POLICY IF EXISTS "Users can view own store ai usage settings" ON ai_usage_settings;

-- 既存のロール別データをバックアップ
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_usage_settings') THEN
    DROP TABLE IF EXISTS ai_usage_settings_backup CASCADE;
    CREATE TABLE ai_usage_settings_backup AS
    SELECT * FROM ai_usage_settings;
    RAISE NOTICE '✅ ai_usage_settings をバックアップしました';
  END IF;
END $$;

-- 既存のデータを削除
TRUNCATE TABLE ai_usage_settings CASCADE;

-- ユニーク制約を削除
ALTER TABLE ai_usage_settings DROP CONSTRAINT IF EXISTS unique_org_role;
ALTER TABLE ai_usage_settings DROP CONSTRAINT IF EXISTS unique_role;
ALTER TABLE ai_usage_settings DROP CONSTRAINT IF EXISTS unique_org_store;
ALTER TABLE ai_usage_settings DROP CONSTRAINT IF EXISTS ai_usage_settings_organization_id_role_key;

-- daily_limit カラムを削除
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_usage_settings' AND column_name = 'daily_limit'
  ) THEN
    ALTER TABLE ai_usage_settings DROP COLUMN daily_limit;
  END IF;
END $$;

-- role カラムを削除し、store_id カラムを追加
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_usage_settings' AND column_name = 'role'
  ) THEN
    ALTER TABLE ai_usage_settings DROP COLUMN role;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_usage_settings' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE ai_usage_settings
    ADD COLUMN store_id uuid REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 新しい複合ユニーク制約を追加
ALTER TABLE ai_usage_settings
ADD CONSTRAINT unique_org_store UNIQUE (organization_id, store_id);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_ai_usage_settings_store_id
ON ai_usage_settings(store_id);

-- ============================================
-- 2. ai_usage_limits テーブルに店舗情報を追加
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_usage_limits' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE ai_usage_limits
    ADD COLUMN store_id uuid REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 既存のユニーク制約を削除
ALTER TABLE ai_usage_limits DROP CONSTRAINT IF EXISTS unique_org_month;
ALTER TABLE ai_usage_limits DROP CONSTRAINT IF EXISTS unique_org_store_month;

-- 新しい複合ユニーク制約を追加
ALTER TABLE ai_usage_limits
ADD CONSTRAINT unique_org_store_month UNIQUE (organization_id, store_id, month);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_ai_usage_limits_store_month
ON ai_usage_limits(store_id, month);

-- ============================================
-- 3. ai_usage_tracking テーブルに店舗情報を追加
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_usage_tracking' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE ai_usage_tracking
    ADD COLUMN store_id uuid REFERENCES stores(id) ON DELETE SET NULL;
  END IF;
END $$;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_store_date
ON ai_usage_tracking(store_id, usage_date);

-- ============================================
-- 4. admin_override_logs テーブルを作成
-- ============================================

CREATE TABLE IF NOT EXISTS admin_override_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  override_type text NOT NULL CHECK (override_type IN ('increase_limit', 'reset_usage', 'permanent_increase')),
  previous_value integer NOT NULL,
  new_value integer NOT NULL,
  reason text,
  is_permanent boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_admin_override_logs_org_store
ON admin_override_logs(organization_id, store_id);

CREATE INDEX IF NOT EXISTS idx_admin_override_logs_created_at
ON admin_override_logs(created_at DESC);

-- RLS有効化
ALTER TABLE admin_override_logs ENABLE ROW LEVEL SECURITY;

-- ポリシー追加
CREATE POLICY "Admins can view own org override logs"
ON admin_override_logs
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id
    FROM organization_members om
    INNER JOIN profiles p ON p.id = om.user_id
    WHERE om.user_id = auth.uid()
    AND p.role = 'admin'
  )
);

CREATE POLICY "Admins can insert override logs"
ON admin_override_logs
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id
    FROM organization_members om
    INNER JOIN profiles p ON p.id = om.user_id
    WHERE om.user_id = auth.uid()
    AND p.role = 'admin'
  )
  AND admin_user_id = auth.uid()
);

-- ============================================
-- 5. データマイグレーション
-- ============================================

-- 各組織の全店舗にデフォルト100回を設定
DO $$
DECLARE
  store_record RECORD;
BEGIN
  FOR store_record IN
    SELECT s.id as store_id, s.organization_id
    FROM stores s
    WHERE s.organization_id IS NOT NULL
    AND s.is_active = true
  LOOP
    INSERT INTO ai_usage_settings (
      organization_id,
      store_id,
      monthly_allocation,
      enabled,
      created_at,
      updated_at
    )
    VALUES (
      store_record.organization_id,
      store_record.store_id,
      100,
      true,
      now(),
      now()
    )
    ON CONFLICT (organization_id, store_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE '✅ 全店舗にデフォルト設定を追加しました';
END $$;

-- ============================================
-- 6. RLSポリシーの設定
-- ============================================

CREATE POLICY "Users can view own store ai usage settings"
ON ai_usage_settings
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update own org ai usage settings"
ON ai_usage_settings
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id
    FROM organization_members om
    INNER JOIN profiles p ON p.id = om.user_id
    WHERE om.user_id = auth.uid()
    AND p.role = 'admin'
  )
)
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id
    FROM organization_members om
    INNER JOIN profiles p ON p.id = om.user_id
    WHERE om.user_id = auth.uid()
    AND p.role = 'admin'
  )
);

CREATE POLICY "Admins can insert own org ai usage settings"
ON ai_usage_settings
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id
    FROM organization_members om
    INNER JOIN profiles p ON p.id = om.user_id
    WHERE om.user_id = auth.uid()
    AND p.role = 'admin'
  )
);

-- ============================================
-- 7. RPC関数の作成
-- ============================================

-- 店舗の使用状況を取得
CREATE OR REPLACE FUNCTION get_store_usage_status(
  p_store_id uuid,
  p_organization_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings ai_usage_settings;
  v_current_month date;
  v_usage_record ai_usage_limits;
  v_current_usage integer;
  v_limit integer;
  v_remaining integer;
BEGIN
  v_current_month := date_trunc('month', now())::date;

  SELECT * INTO v_settings
  FROM ai_usage_settings
  WHERE store_id = p_store_id
    AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    v_limit := 100;
  ELSE
    v_limit := v_settings.monthly_allocation;
  END IF;

  SELECT * INTO v_usage_record
  FROM ai_usage_limits
  WHERE store_id = p_store_id
    AND organization_id = p_organization_id
    AND month = v_current_month;

  IF NOT FOUND THEN
    v_current_usage := 0;
  ELSE
    v_current_usage := v_usage_record.monthly_usage;
  END IF;

  v_remaining := GREATEST(0, v_limit - v_current_usage);

  RETURN jsonb_build_object(
    'store_id', p_store_id,
    'current_usage', v_current_usage,
    'limit', v_limit,
    'remaining', v_remaining,
    'percentage', CASE
      WHEN v_limit > 0 THEN ROUND((v_current_usage::numeric / v_limit::numeric) * 100, 1)
      ELSE 0
    END,
    'can_use', v_current_usage < v_limit,
    'month', v_current_month
  );
END;
$$;

-- 管理者が店舗の上限を増加
CREATE OR REPLACE FUNCTION admin_override_store_limit(
  p_store_id uuid,
  p_organization_id uuid,
  p_increase_amount integer,
  p_reason text DEFAULT NULL,
  p_is_permanent boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_user_id uuid;
  v_is_admin boolean;
  v_current_limit integer;
  v_new_limit integer;
  v_settings ai_usage_settings;
BEGIN
  v_admin_user_id := auth.uid();

  SELECT EXISTS (
    SELECT 1
    FROM organization_members om
    INNER JOIN profiles p ON p.id = om.user_id
    WHERE om.user_id = v_admin_user_id
      AND om.organization_id = p_organization_id
      AND p.role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '管理者権限が必要です'
    );
  END IF;

  SELECT * INTO v_settings
  FROM ai_usage_settings
  WHERE store_id = p_store_id
    AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    v_current_limit := 100;
    INSERT INTO ai_usage_settings (
      organization_id,
      store_id,
      monthly_allocation,
      enabled
    )
    VALUES (
      p_organization_id,
      p_store_id,
      100 + p_increase_amount,
      true
    )
    RETURNING * INTO v_settings;
  ELSE
    v_current_limit := v_settings.monthly_allocation;
  END IF;

  v_new_limit := v_current_limit + p_increase_amount;

  UPDATE ai_usage_settings
  SET monthly_allocation = v_new_limit,
      updated_at = now()
  WHERE store_id = p_store_id
    AND organization_id = p_organization_id;

  INSERT INTO admin_override_logs (
    organization_id,
    store_id,
    admin_user_id,
    override_type,
    previous_value,
    new_value,
    reason,
    is_permanent,
    expires_at
  )
  VALUES (
    p_organization_id,
    p_store_id,
    v_admin_user_id,
    CASE WHEN p_is_permanent THEN 'permanent_increase' ELSE 'increase_limit' END,
    v_current_limit,
    v_new_limit,
    p_reason,
    p_is_permanent,
    CASE WHEN p_is_permanent THEN NULL ELSE (date_trunc('month', now()) + interval '1 month')::timestamptz END
  );

  RETURN jsonb_build_object(
    'success', true,
    'previous_limit', v_current_limit,
    'new_limit', v_new_limit,
    'message', format('上限を %s 回増やしました（%s → %s）', p_increase_amount, v_current_limit, v_new_limit)
  );
END;
$$;

-- 管理者が店舗の使用回数をリセット
CREATE OR REPLACE FUNCTION reset_store_monthly_usage(
  p_store_id uuid,
  p_organization_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_user_id uuid;
  v_is_admin boolean;
  v_current_month date;
  v_current_usage integer;
  v_usage_record ai_usage_limits;
BEGIN
  v_admin_user_id := auth.uid();

  SELECT EXISTS (
    SELECT 1
    FROM organization_members om
    INNER JOIN profiles p ON p.id = om.user_id
    WHERE om.user_id = v_admin_user_id
      AND om.organization_id = p_organization_id
      AND p.role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '管理者権限が必要です'
    );
  END IF;

  v_current_month := date_trunc('month', now())::date;

  SELECT * INTO v_usage_record
  FROM ai_usage_limits
  WHERE store_id = p_store_id
    AND organization_id = p_organization_id
    AND month = v_current_month;

  IF NOT FOUND THEN
    v_current_usage := 0;
  ELSE
    v_current_usage := v_usage_record.monthly_usage;
  END IF;

  IF FOUND THEN
    UPDATE ai_usage_limits
    SET monthly_usage = 0,
        updated_at = now()
    WHERE store_id = p_store_id
      AND organization_id = p_organization_id
      AND month = v_current_month;
  END IF;

  INSERT INTO admin_override_logs (
    organization_id,
    store_id,
    admin_user_id,
    override_type,
    previous_value,
    new_value,
    reason,
    is_permanent
  )
  VALUES (
    p_organization_id,
    p_store_id,
    v_admin_user_id,
    'reset_usage',
    v_current_usage,
    0,
    p_reason,
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'previous_usage', v_current_usage,
    'message', format('使用回数をリセットしました（%s → 0）', v_current_usage)
  );
END;
$$;

-- 関数の実行権限を付与
GRANT EXECUTE ON FUNCTION get_store_usage_status(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_override_store_limit(uuid, uuid, integer, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_store_monthly_usage(uuid, uuid, text) TO authenticated;
