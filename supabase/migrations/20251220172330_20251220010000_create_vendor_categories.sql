/*
  # 業者カテゴリ管理機能

  1. 新しいテーブル
    - `vendor_categories`
      - `id` (text, primary key) - カテゴリID（キー）
      - `organization_id` (uuid, foreign key)
      - `name` (text) - カテゴリ表示名
      - `color` (text) - カテゴリの色
      - `is_default` (boolean) - デフォルトカテゴリかどうか
      - `display_order` (integer) - 表示順序
      - `is_active` (boolean) - 有効/無効
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. セキュリティ
    - RLSを有効化
    - 組織メンバーのみがカテゴリを閲覧・作成・編集できるポリシー

  3. デフォルトデータ
    - 現在の8つのカテゴリをデフォルトとして挿入
*/

-- カテゴリテーブル
CREATE TABLE IF NOT EXISTS vendor_categories (
  id text NOT NULL,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#3B82F6',
  is_default boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id, organization_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_vendor_categories_org ON vendor_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendor_categories_active ON vendor_categories(organization_id, is_active);

-- RLS有効化
ALTER TABLE vendor_categories ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can view categories in their organization"
  ON vendor_categories
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can create categories"
  ON vendor_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "Managers can update categories"
  ON vendor_categories
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "Managers can delete categories"
  ON vendor_categories
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  );

-- デフォルトカテゴリを各組織に挿入
DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM organizations LOOP
    -- デフォルトカテゴリを挿入
    INSERT INTO vendor_categories (id, organization_id, name, color, is_default, display_order, is_active)
    VALUES
      ('vegetable_meat', org.id, '野菜・肉類', '#10B981', true, 1, true),
      ('seafood', org.id, '魚介類', '#3B82F6', true, 2, true),
      ('alcohol', org.id, '酒類', '#8B5CF6', true, 3, true),
      ('rice', org.id, '米穀', '#F59E0B', true, 4, true),
      ('seasoning', org.id, '調味料', '#F97316', true, 5, true),
      ('frozen', org.id, '冷凍食品', '#06B6D4', true, 6, true),
      ('dessert', org.id, '製菓・デザート', '#EC4899', true, 7, true),
      ('others', org.id, 'その他', '#6B7280', true, 8, true)
    ON CONFLICT (id, organization_id) DO NOTHING;
  END LOOP;
END $$;

-- 新規組織作成時に自動的にデフォルトカテゴリを作成する関数
CREATE OR REPLACE FUNCTION create_default_vendor_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO vendor_categories (id, organization_id, name, color, is_default, display_order, is_active)
  VALUES
    ('vegetable_meat', NEW.id, '野菜・肉類', '#10B981', true, 1, true),
    ('seafood', NEW.id, '魚介類', '#3B82F6', true, 2, true),
    ('alcohol', NEW.id, '酒類', '#8B5CF6', true, 3, true),
    ('rice', NEW.id, '米穀', '#F59E0B', true, 4, true),
    ('seasoning', NEW.id, '調味料', '#F97316', true, 5, true),
    ('frozen', NEW.id, '冷凍食品', '#06B6D4', true, 6, true),
    ('dessert', NEW.id, '製菓・デザート', '#EC4899', true, 7, true),
    ('others', NEW.id, 'その他', '#6B7280', true, 8, true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーを作成
DROP TRIGGER IF EXISTS create_vendor_categories_on_org_create ON organizations;
CREATE TRIGGER create_vendor_categories_on_org_create
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_default_vendor_categories();
