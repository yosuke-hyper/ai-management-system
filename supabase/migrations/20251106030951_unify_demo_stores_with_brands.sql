/*
  # デモ店舗の統一とブランド設定

  1. 目的
    - 個別デモセッション用の `demo_stores` テーブルに `brand_id` を追加
    - 固定デモと同じブランド（居酒屋）を参照
    - すべてのデモ環境で一貫した店舗設定（渋谷店、新宿店）を保証

  2. 変更内容
    - `demo_stores` テーブルに `brand_id` カラムを追加
    - 既存のデモ店舗に居酒屋ブランドを割り当て
    - `fixed_demo_brands` を参照するように設定

  3. データ整合性
    - すべてのデモ店舗が居酒屋ブランドに所属
    - 店舗名は「新宿店」「渋谷店」のみ
    - 固定デモと個別デモで同じブランド体系を使用

  4. セキュリティ
    - RLS ポリシーは既存のまま
    - ブランド情報は `fixed_demo_brands` から参照（読み取り専用）
*/

-- demo_stores テーブルに brand_id を追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'demo_stores'
      AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE demo_stores
    ADD COLUMN brand_id uuid REFERENCES fixed_demo_brands(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_demo_stores_brand ON demo_stores(brand_id);

    RAISE NOTICE '✅ demo_stores に brand_id カラムを追加';
  ELSE
    RAISE NOTICE 'ℹ️ demo_stores.brand_id は既に存在します';
  END IF;
END $$;

-- 既存のデモ店舗に居酒屋ブランドを割り当て
UPDATE demo_stores
SET brand_id = '10000000-0000-0000-0000-000000000001'
WHERE brand_id IS NULL;

-- 既存の池袋店・横浜店があれば削除（渋谷店・新宿店のみに統一）
DELETE FROM demo_stores
WHERE name IN ('池袋店', '横浜店');
