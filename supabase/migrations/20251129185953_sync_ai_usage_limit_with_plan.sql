/*
  # AI利用回数をプラン別に自動設定

  ## 概要
  店舗ごとのAI利用回数制限を、組織のプランに応じて自動的に設定します。
  - Starter: 50回/店舗/月
  - Standard: 300回/店舗/月
  - Premium: 2000回/店舗/月

  ## 変更内容
  1. Functions
     - `get_plan_ai_limit()`: プラン名からAI利用回数制限を取得
     - `sync_store_ai_limit()`: 店舗作成時に組織のプランに応じたAI利用回数を設定
     - `update_all_stores_ai_limits()`: プラン変更時に全店舗のAI利用回数を更新

  2. Triggers
     - `sync_ai_limit_on_store_create`: 店舗作成時にAI利用回数を自動設定
     - `sync_ai_limit_on_plan_change`: プラン変更時に全店舗のAI利用回数を更新

  3. データ修正
     - 既存の全店舗のAI利用回数を現在のプランに合わせて更新
*/

-- Function: プラン名からAI利用回数制限を取得
CREATE OR REPLACE FUNCTION get_plan_ai_limit(plan_name text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE plan_name
    WHEN 'starter' THEN 50
    WHEN 'standard' THEN 300
    WHEN 'premium' THEN 2000
    ELSE 100  -- デフォルト値
  END;
END;
$$;

-- Function: 店舗作成時に組織のプランに応じたAI利用回数を設定
CREATE OR REPLACE FUNCTION sync_store_ai_limit()
RETURNS TRIGGER AS $$
DECLARE
  org_plan_name text;
  ai_limit integer;
BEGIN
  -- 組織の現在のプラン名を取得
  SELECT sp.name INTO org_plan_name
  FROM organization_subscriptions os
  INNER JOIN subscription_plans sp ON sp.id = os.plan_id
  WHERE os.organization_id = NEW.organization_id
    AND os.status IN ('active', 'trial')
  ORDER BY os.created_at DESC
  LIMIT 1;

  -- プランが見つからない場合はデフォルト値を使用
  IF org_plan_name IS NULL THEN
    ai_limit := 100;
  ELSE
    ai_limit := get_plan_ai_limit(org_plan_name);
  END IF;

  -- ai_usage_settingsに設定を追加または更新
  INSERT INTO ai_usage_settings (
    organization_id,
    store_id,
    monthly_allocation,
    enabled,
    created_at,
    updated_at
  )
  VALUES (
    NEW.organization_id,
    NEW.id,
    ai_limit,
    true,
    now(),
    now()
  )
  ON CONFLICT (organization_id, store_id)
  DO UPDATE SET
    monthly_allocation = ai_limit,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: プラン変更時に全店舗のAI利用回数を更新
CREATE OR REPLACE FUNCTION update_all_stores_ai_limits()
RETURNS TRIGGER AS $$
DECLARE
  ai_limit integer;
BEGIN
  -- 新しいプランのAI利用回数制限を取得
  SELECT get_plan_ai_limit(sp.name) INTO ai_limit
  FROM subscription_plans sp
  WHERE sp.id = NEW.plan_id;

  -- その組織の全店舗のAI利用回数を更新
  UPDATE ai_usage_settings
  SET monthly_allocation = ai_limit,
      updated_at = now()
  WHERE organization_id = NEW.organization_id
    AND store_id IN (
      SELECT id FROM stores WHERE organization_id = NEW.organization_id AND is_active = true
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: 店舗作成時にAI利用回数を自動設定
DROP TRIGGER IF EXISTS sync_ai_limit_on_store_create ON stores;
CREATE TRIGGER sync_ai_limit_on_store_create
AFTER INSERT ON stores
FOR EACH ROW
EXECUTE FUNCTION sync_store_ai_limit();

-- Trigger: プラン変更時に全店舗のAI利用回数を更新
DROP TRIGGER IF EXISTS sync_ai_limit_on_plan_change ON organization_subscriptions;
CREATE TRIGGER sync_ai_limit_on_plan_change
AFTER INSERT OR UPDATE OF plan_id ON organization_subscriptions
FOR EACH ROW
WHEN (NEW.status IN ('active', 'trial'))
EXECUTE FUNCTION update_all_stores_ai_limits();

-- 既存の全店舗のAI利用回数を現在のプランに合わせて更新
DO $$
DECLARE
  org_record RECORD;
  ai_limit integer;
BEGIN
  FOR org_record IN
    SELECT DISTINCT
      os.organization_id,
      sp.name as plan_name
    FROM organization_subscriptions os
    INNER JOIN subscription_plans sp ON sp.id = os.plan_id
    WHERE os.status IN ('active', 'trial')
  LOOP
    ai_limit := get_plan_ai_limit(org_record.plan_name);

    UPDATE ai_usage_settings
    SET monthly_allocation = ai_limit,
        updated_at = now()
    WHERE organization_id = org_record.organization_id;

    RAISE NOTICE '組織 % のAI利用回数を % 回に更新しました（プラン: %）',
      org_record.organization_id, ai_limit, org_record.plan_name;
  END LOOP;

  RAISE NOTICE '✅ 全店舗のAI利用回数をプランに合わせて更新しました';
END $$;