/*
  # デモ専用業態テーブル作成
  
  1. 新規テーブル
    - `fixed_demo_brands` - デモ専用業態テーブル（3業態固定）
      - id (uuid, primary key)
      - name (text, unique) - 業態名
      - display_name (text) - 表示名
      - type (text) - 業態タイプ
      - color (text) - UIカラー
      - icon (text) - 絵文字アイコン
      - description (text) - 説明
      - default_cost_rate (numeric) - 標準原価率
      - default_labor_rate (numeric) - 標準人件費率
      - default_profit_margin (numeric) - 標準営業利益率
      - created_at (timestamptz)
      
  2. セキュリティ
    - RLS有効化: すべてのユーザーが読み取り可能（public SELECT）
    - 書き込みは禁止（デモデータは固定）
    
  3. 固定データ
    - 居酒屋（🍺）
    - ラーメン（🍜）
    - イタリアン（🍝）
*/

-- ============================================
-- 1. テーブル作成
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

-- ============================================
-- 2. RLS設定
-- ============================================

ALTER TABLE fixed_demo_brands ENABLE ROW LEVEL SECURITY;

-- すべてのロール（public）に対してSELECT許可
CREATE POLICY "Public read access to fixed demo brands"
  ON fixed_demo_brands
  FOR SELECT
  TO public
  USING (true);

-- ============================================
-- 3. インデックス
-- ============================================

CREATE INDEX IF NOT EXISTS idx_fixed_demo_brands_type ON fixed_demo_brands(type);
CREATE INDEX IF NOT EXISTS idx_fixed_demo_brands_name ON fixed_demo_brands(name);

-- ============================================
-- 4. 固定デモ業態データを投入（3業態）
-- ============================================

-- 既存データがあれば削除
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
-- 5. fixed_demo_stores に brand_id を追加
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
  END IF;
END $$;

-- ============================================
-- 6. デモ店舗に業態を割り当て
-- ============================================

-- 既存の2店舗（新宿店、渋谷店）を「居酒屋」業態に設定
UPDATE fixed_demo_stores
SET brand_id = '10000000-0000-0000-0000-000000000001'
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

-- ============================================
-- 7. コメント追加
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
