/*
  # 契約店舗数フィールドの追加

  ## 変更内容

  ### `organization_subscriptions` テーブル
  - `contracted_stores` (integer) - 契約店舗数を追加
    - デフォルト値: 1
    - NOT NULL制約
    - チェック制約: 1以上

  ## 変更理由
  1. サインアップ時に選択した店舗数を記録
  2. 契約店舗数に基づいた料金計算を可能に
  3. 店舗追加時の上限チェックに使用

  ## 既存データの処理
  - 既存のサブスクリプションには contracted_stores = 1 を設定
  - プランのmax_storesと整合性を保つ
*/

-- contracted_stores カラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organization_subscriptions'
    AND column_name = 'contracted_stores'
  ) THEN
    ALTER TABLE organization_subscriptions
    ADD COLUMN contracted_stores integer NOT NULL DEFAULT 1
    CHECK (contracted_stores >= 1 AND contracted_stores <= 100);
  END IF;
END $$;

-- 既存のサブスクリプションの contracted_stores を現在の店舗数に合わせる
DO $$
DECLARE
  sub_record RECORD;
  store_count integer;
BEGIN
  FOR sub_record IN SELECT id, organization_id FROM organization_subscriptions
  LOOP
    -- 組織の現在の店舗数を取得
    SELECT COUNT(*) INTO store_count
    FROM stores
    WHERE organization_id = sub_record.organization_id;

    -- 店舗数が0の場合は1に設定
    IF store_count = 0 THEN
      store_count := 1;
    END IF;

    -- contracted_stores を更新
    UPDATE organization_subscriptions
    SET contracted_stores = store_count
    WHERE id = sub_record.id;
  END LOOP;
END $$;

-- コメントを追加
COMMENT ON COLUMN organization_subscriptions.contracted_stores IS '契約店舗数（1〜4店舗は自動、5店舗以上は見積対応）';
