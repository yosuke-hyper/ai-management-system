/*
  # デモ環境と本番環境の完全分離 - 固定デモ業態システム

  1. 概要
    - デモ専用の業態テーブル (`fixed_demo_brands`) を作成
    - 3業態を固定データとして登録（居酒屋、ラーメン、イタリアン）
    - デモ店舗を2店舗のみに絞る（渋谷店、新宿店）
    - 両店舗を「居酒屋」業態に所属させる
    - 本番環境のデータとの完全分離を保証

  2. 新規テーブル
    - `fixed_demo_brands` - デモ専用業態テーブル（3業態固定）

  3. 既存テーブルの変更
    - `fixed_demo_stores` に `brand_id` カラムを追加
    - 既存の不要なデモ店舗（池袋店、横浜店）を削除
    - 店舗名を更新（渋谷店、新宿店のみ）

  4. セキュリティ
    - RLS有効化: すべてのユーザーが読み取り可能
    - 書き込みは禁止（デモデータは固定）
    - 本番テーブル (`brands`, `stores`) とは完全に分離

  5. データ整合性
    - デモ環境は `fixed_demo_*` テーブルのみを参照
    - 本番環境は通常の `brands`, `stores` テーブルを参照
    - 相互影響を完全に防止
*/

-- ============================================
-- 1. 固定デモ業態テーブル作成
-- ============================================

CREATE TABLE IF NOT EXISTS fixed_demo_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  type text NOT NULL DEFAULT 'restaurant',
  color text DEFAULT '#3B82F6',
  icon text DEFAULT '🏪',
  description text,
  default_cost_rate numeric DEFAULT 30,
  default_labor_rate numeric DEFAULT 25,
  default_profit_margin numeric DEFAULT 20,
  created_at timestamptz DEFAULT now()
);

-- RLSを有効化（読み取り専用）
ALTER TABLE fixed_demo_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fixed demo brands"
  ON fixed_demo_brands
  FOR SELECT
  USING (true);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_fixed_demo_brands_type ON fixed_demo_brands(type);

-- ============================================
-- 2. fixed_demo_stores テーブルに brand_id を追加
-- ============================================

DO $$
BEGIN
  -- brand_id カラムを追加（存在しない場合）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fixed_demo_stores'
      AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE fixed_demo_stores
    ADD COLUMN brand_id uuid REFERENCES fixed_demo_brands(id) ON DELETE SET NULL;

    CREATE INDEX idx_fixed_demo_stores_brand ON fixed_demo_stores(brand_id);

    RAISE NOTICE '✅ fixed_demo_stores に brand_id カラムを追加';
  ELSE
    RAISE NOTICE 'ℹ️ fixed_demo_stores.brand_id は既に存在します';
  END IF;
END $$;

-- ============================================
-- 3. 固定デモ業態データを投入（3業態）
-- ============================================

-- 既存のデモ業態を削除（クリーンスタート）
TRUNCATE TABLE fixed_demo_brands CASCADE;

-- 3業態を固定データとして登録
INSERT INTO fixed_demo_brands (id, name, display_name, type, color, icon, description, default_cost_rate, default_labor_rate, default_profit_margin)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    '居酒屋',
    '居酒屋',
    'izakaya',
    '#F59E0B',
    '🍺',
    'カジュアルな雰囲気の居酒屋チェーン',
    32.0,
    28.0,
    25.0
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'ラーメン',
    'ラーメン',
    'ramen',
    '#EF4444',
    '🍜',
    '本格的なラーメン専門店',
    35.0,
    25.0,
    22.0
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'イタリアン',
    'イタリアン',
    'italian',
    '#10B981',
    '🍝',
    'カジュアルイタリアンレストラン',
    30.0,
    26.0,
    28.0
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  type = EXCLUDED.type,
  color = EXCLUDED.color,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  default_cost_rate = EXCLUDED.default_cost_rate,
  default_labor_rate = EXCLUDED.default_labor_rate,
  default_profit_margin = EXCLUDED.default_profit_margin;

-- ============================================
-- 4. デモ店舗を2店舗のみに更新
-- ============================================

-- 既存のデモ店舗データを削除
DELETE FROM fixed_demo_stores WHERE id NOT IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

-- 2店舗のデータを更新（業態IDを「居酒屋」に設定）
UPDATE fixed_demo_stores
SET
  name = '渋谷店',
  location = '東京都渋谷区',
  brand_id = '10000000-0000-0000-0000-000000000001'
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE fixed_demo_stores
SET
  name = '新宿店',
  location = '東京都新宿区',
  brand_id = '10000000-0000-0000-0000-000000000001'
WHERE id = '11111111-1111-1111-1111-111111111111';

-- 店舗が存在しない場合は新規作成
INSERT INTO fixed_demo_stores (id, name, location, brand_id)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '新宿店',
    '東京都新宿区',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '渋谷店',
    '東京都渋谷区',
    '10000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  brand_id = EXCLUDED.brand_id;

-- ============================================
-- 5. 不要なデモ店舗に関連するデータを削除
-- ============================================

-- 削除された店舗の日報データを削除
DELETE FROM fixed_demo_reports
WHERE store_id NOT IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

-- 削除された店舗の月次経費データを削除
DELETE FROM fixed_demo_monthly_expenses
WHERE store_id NOT IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

-- 削除された店舗の目標データを削除
DELETE FROM fixed_demo_targets
WHERE store_id NOT IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

-- ============================================
-- 6. コメント追加（ドキュメント）
-- ============================================

COMMENT ON TABLE fixed_demo_brands IS 'デモ専用業態テーブル - 3業態固定（居酒屋、ラーメン、イタリアン）';
COMMENT ON COLUMN fixed_demo_brands.name IS '業態名（システム内部用）';
COMMENT ON COLUMN fixed_demo_brands.display_name IS '表示名（UI表示用）';
COMMENT ON COLUMN fixed_demo_brands.type IS '業態タイプ（izakaya/ramen/italian）';
COMMENT ON COLUMN fixed_demo_brands.icon IS '絵文字アイコン';
COMMENT ON COLUMN fixed_demo_brands.color IS 'UIカラーコード';
COMMENT ON COLUMN fixed_demo_brands.default_cost_rate IS '標準原価率（%）';
COMMENT ON COLUMN fixed_demo_brands.default_labor_rate IS '標準人件費率（%）';
COMMENT ON COLUMN fixed_demo_brands.default_profit_margin IS '標準営業利益率（%）';

COMMENT ON COLUMN fixed_demo_stores.brand_id IS '所属業態ID（fixed_demo_brandsへの外部キー）';

-- 検証クエリ（開発時に確認用）
DO $$
DECLARE
  brand_count integer;
  store_count integer;
BEGIN
  SELECT COUNT(*) INTO brand_count FROM fixed_demo_brands;
  SELECT COUNT(*) INTO store_count FROM fixed_demo_stores;

  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ デモ環境セットアップ完了';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '📊 登録業態数: % 件（期待値: 3件）', brand_count;
  RAISE NOTICE '🏪 登録店舗数: % 件（期待値: 2件）', store_count;
  RAISE NOTICE '==========================================';

  IF brand_count = 3 AND store_count = 2 THEN
    RAISE NOTICE '🎉 デモデータが正常に設定されました！';
  ELSE
    RAISE WARNING '⚠️ デモデータの件数が期待値と異なります';
  END IF;
END $$;
