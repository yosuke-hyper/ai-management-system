/*
  # contracted_storesを実際の店舗数と同期（修正版）

  ## 概要
  店舗数課金方式（プラン単価 × 登録店舗数）に対応するため、
  organization_subscriptionsテーブルのcontracted_storesを
  実際の登録店舗数と自動同期します。

  ## 変更内容
  1. Triggers
     - `sync_contracted_stores_on_store_change`: 店舗追加・削除・状態変更時にcontracted_storesを更新
  
  2. Functions
     - `update_contracted_stores()`: 組織の実際のアクティブ店舗数をcontracted_storesに反映
       （最小値: 1店舗）

  ## 動作
  - 店舗が追加されると、その組織のcontracted_storesが自動的に+1される
  - 店舗が削除されると、その組織のcontracted_storesが自動的に-1される
  - 店舗のis_activeが変更されると、contracted_storesが再計算される
  - contracted_storesは最低1（チェック制約により1〜100の範囲）
*/

-- Function: contracted_storesを実際の店舗数と同期
CREATE OR REPLACE FUNCTION update_contracted_stores()
RETURNS TRIGGER AS $$
DECLARE
  org_id uuid;
  active_store_count int;
BEGIN
  -- 影響を受ける組織IDを取得
  IF TG_OP = 'DELETE' THEN
    org_id := OLD.organization_id;
  ELSE
    org_id := NEW.organization_id;
  END IF;

  -- その組織のアクティブな店舗数を取得
  SELECT COUNT(*)
  INTO active_store_count
  FROM stores
  WHERE organization_id = org_id
    AND is_active = true;

  -- 最低1店舗として設定（チェック制約に対応）
  active_store_count := GREATEST(active_store_count, 1);

  -- organization_subscriptionsのcontracted_storesを更新
  UPDATE organization_subscriptions
  SET contracted_stores = active_store_count
  WHERE organization_id = org_id
    AND status IN ('active', 'trial');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: 店舗の追加・削除・更新時にcontracted_storesを同期
DROP TRIGGER IF EXISTS sync_contracted_stores_on_store_change ON stores;
CREATE TRIGGER sync_contracted_stores_on_store_change
AFTER INSERT OR UPDATE OF is_active OR DELETE ON stores
FOR EACH ROW
EXECUTE FUNCTION update_contracted_stores();

-- 既存の全組織のcontracted_storesを現在の店舗数で初期化
UPDATE organization_subscriptions os
SET contracted_stores = GREATEST(
  (
    SELECT COUNT(*)
    FROM stores s
    WHERE s.organization_id = os.organization_id
      AND s.is_active = true
  ),
  1
)
WHERE status IN ('active', 'trial');