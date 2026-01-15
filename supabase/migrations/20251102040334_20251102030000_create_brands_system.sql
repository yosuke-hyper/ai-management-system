/*
  # 業態/ブランド管理システムの追加

  ## 概要
  複数業態を管理するため、brands（業態/ブランド）テーブルを追加します。

  ## 新規テーブル
    1. `brands` - 業態/ブランド情報
       - 組織内で複数の業態（居酒屋、カフェ、ラーメンなど）を管理
       - 業態ごとの標準KPI設定を保持
       - UIカラーやアイコンでブランドを視覚的に区別

  ## 既存テーブルの変更
    1. `stores` テーブルに `brand_id` カラムを追加
       - 各店舗がどの業態に属するかを管理
       - NULL許容（既存店舗への影響を最小化）

  ## セキュリティ
    - RLS有効化: 組織メンバーのみがブランド情報にアクセス可能
    - 業態の作成・編集・削除は管理者のみ
*/

-- ============================================
-- 1. brands テーブル作成
-- ============================================

CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_name text NOT NULL,
  type text NOT NULL DEFAULT 'restaurant',
  default_target_profit_margin numeric DEFAULT 20,
  default_cost_rate numeric DEFAULT 30,
  default_labor_rate numeric DEFAULT 25,
  color text DEFAULT '#3B82F6',
  icon text DEFAULT '🏪',
  description text,
  settings jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT brands_name_org_unique UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_brands_organization ON brands(organization_id);
CREATE INDEX IF NOT EXISTS idx_brands_active ON brands(is_active) WHERE is_active = true;

-- ============================================
-- 2. stores テーブルに brand_id を追加
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stores'
      AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE stores ADD COLUMN brand_id uuid REFERENCES brands(id) ON DELETE SET NULL;
    CREATE INDEX idx_stores_brand ON stores(brand_id);
    RAISE NOTICE '✅ stores テーブルに brand_id を追加';
  ELSE
    RAISE NOTICE 'ℹ️ stores.brand_id は既に存在します';
  END IF;
END $$;

-- ============================================
-- 3. RLS ポリシー設定
-- ============================================

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- 組織メンバーは自組織のブランドを閲覧可能
CREATE POLICY "Organization members can view brands"
  ON brands
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- 管理者・オーナーはブランドを作成可能
CREATE POLICY "Admins can create brands"
  ON brands
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- 管理者・オーナーはブランドを更新可能
CREATE POLICY "Admins can update brands"
  ON brands
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- 管理者・オーナーはブランドを削除可能（実際は論理削除推奨）
CREATE POLICY "Admins can delete brands"
  ON brands
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 4. updated_at 自動更新トリガー
-- ============================================

CREATE OR REPLACE FUNCTION update_brands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_brands_updated_at ON brands;
CREATE TRIGGER trigger_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_brands_updated_at();

-- ============================================
-- 5. サンプルデータ（開発環境用）
-- ============================================

-- サンプルブランドを挿入する関数（任意実行）
CREATE OR REPLACE FUNCTION insert_sample_brands(org_id uuid)
RETURNS void AS $$
BEGIN
  -- 既存のブランドがある場合はスキップ
  IF EXISTS (SELECT 1 FROM brands WHERE organization_id = org_id) THEN
    RAISE NOTICE 'ℹ️ ブランドは既に存在します';
    RETURN;
  END IF;

  INSERT INTO brands (organization_id, name, display_name, type, color, icon, default_target_profit_margin, default_cost_rate, default_labor_rate, display_order)
  VALUES
    (org_id, '居酒屋', '居酒屋ブランド', 'izakaya', '#F59E0B', '🍺', 25, 32, 28, 1),
    (org_id, 'カフェ', 'カフェブランド', 'cafe', '#10B981', '☕', 30, 28, 22, 2),
    (org_id, 'ラーメン', 'ラーメンブランド', 'ramen', '#EF4444', '🍜', 22, 35, 25, 3);

  RAISE NOTICE '✅ サンプルブランドを3件挿入しました';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE brands IS '業態/ブランド情報テーブル - 組織内の複数業態を管理';
COMMENT ON COLUMN brands.name IS '業態名（システム内部用、シンプルな名称）';
COMMENT ON COLUMN brands.display_name IS '表示名（UI表示用、詳細な名称）';
COMMENT ON COLUMN brands.type IS '業態タイプ（izakaya/cafe/ramen/restaurant など）';
COMMENT ON COLUMN brands.default_target_profit_margin IS '業態標準営業利益率（%）';
COMMENT ON COLUMN brands.default_cost_rate IS '業態標準原価率（%）';
COMMENT ON COLUMN brands.default_labor_rate IS '業態標準人件費率（%）';
COMMENT ON COLUMN brands.color IS 'UI表示用カラーコード（例: #3B82F6）';
COMMENT ON COLUMN brands.icon IS 'UI表示用絵文字アイコン（例: 🍺）';
COMMENT ON COLUMN brands.settings IS '業態固有設定（JSON形式）';
COMMENT ON COLUMN brands.display_order IS '表示順序（昇順）';