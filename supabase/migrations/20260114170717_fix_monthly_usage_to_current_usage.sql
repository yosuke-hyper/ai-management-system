/*
  # カラム名 monthly_usage を current_usage に統一

  ## 変更内容

  1. RPC関数の修正
    - get_store_usage_status: monthly_usage → current_usage
    - reset_store_monthly_usage: monthly_usage → current_usage

  ## 対象テーブル
    - ai_usage_limits (カラム名は既に current_usage で正しい)

  ## 重要
    - RPC関数のみを修正します
    - フロントエンドのコードも併せて修正が必要です
*/

-- ============================================
-- 1. get_store_usage_status 関数を修正
-- ============================================

CREATE OR REPLACE FUNCTION get_store_usage_status(
  p_store_id uuid,
  p_organization_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    v_current_usage := v_usage_record.current_usage;
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

-- ============================================
-- 2. reset_store_monthly_usage 関数を修正
-- ============================================

CREATE OR REPLACE FUNCTION reset_store_monthly_usage(
  p_store_id uuid,
  p_organization_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    v_current_usage := v_usage_record.current_usage;
  END IF;

  IF FOUND THEN
    UPDATE ai_usage_limits
    SET current_usage = 0,
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

-- ============================================
-- 3. 権限の付与
-- ============================================

GRANT EXECUTE ON FUNCTION get_store_usage_status(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_store_monthly_usage(uuid, uuid, text) TO authenticated;
