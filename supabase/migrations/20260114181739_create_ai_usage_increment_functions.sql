/*
  # AI使用回数を安全に増加させるRPC関数

  1. 新規関数
    - `increment_store_ai_usage` - 店舗のAI使用回数を+1（upsertで同時実行安全）
    - `track_user_ai_usage` - ユーザーのAI使用を記録（upsertで同時実行安全）

  2. 特徴
    - upsertパターンで同時実行に強い
    - month キーは必ず `date_trunc('month', now())::date` で統一
    - current_usage と monthly_usage を両方更新（互換性）
    - エラーハンドリング付き
*/

-- 店舗のAI使用回数を増加
CREATE OR REPLACE FUNCTION increment_store_ai_usage(
  p_organization_id uuid,
  p_store_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_month date;
BEGIN
  -- 今月の初日を取得（必ずこの形式）
  v_current_month := date_trunc('month', now())::date;

  -- upsert パターンで同時実行に強い
  INSERT INTO ai_usage_limits (
    organization_id,
    store_id,
    month,
    current_usage,
    monthly_usage,
    created_at,
    updated_at
  )
  VALUES (
    p_organization_id,
    p_store_id,
    v_current_month,
    1,
    1,
    now(),
    now()
  )
  ON CONFLICT (organization_id, store_id, month)
  DO UPDATE SET
    current_usage = ai_usage_limits.current_usage + 1,
    monthly_usage = ai_usage_limits.monthly_usage + 1,
    updated_at = now();

  RAISE LOG 'Incremented AI usage for store % in org %: month=%', p_store_id, p_organization_id, v_current_month;
END;
$$;

-- ユーザーのAI使用を記録
CREATE OR REPLACE FUNCTION track_user_ai_usage(
  p_user_id uuid,
  p_organization_id uuid,
  p_store_id uuid,
  p_usage_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- upsert パターンで同時実行に強い
  INSERT INTO ai_usage_tracking (
    user_id,
    organization_id,
    store_id,
    usage_date,
    request_count,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_organization_id,
    p_store_id,
    p_usage_date,
    1,
    now(),
    now()
  )
  ON CONFLICT (user_id, organization_id, usage_date)
  DO UPDATE SET
    request_count = ai_usage_tracking.request_count + 1,
    updated_at = now();

  RAISE LOG 'Tracked AI usage for user % in org %: date=%', p_user_id, p_organization_id, p_usage_date;
EXCEPTION
  WHEN OTHERS THEN
    -- エラーが発生してもメイン処理は続行（ログだけ取れなくてもOK）
    RAISE WARNING 'Failed to track user AI usage: %', SQLERRM;
END;
$$;

-- 関数の実行権限を付与
GRANT EXECUTE ON FUNCTION increment_store_ai_usage(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION track_user_ai_usage(uuid, uuid, uuid, date) TO service_role;

-- ai_usage_tracking に unique constraint を追加（まだない場合）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_user_org_date'
  ) THEN
    ALTER TABLE ai_usage_tracking
    ADD CONSTRAINT unique_user_org_date UNIQUE (user_id, organization_id, usage_date);
    
    RAISE NOTICE '✅ unique_user_org_date constraint を追加しました';
  END IF;
END $$;
