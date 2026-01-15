/*
  # 業者割り当てテンプレート機能

  1. 新しいテーブル
    - `vendor_assignment_templates`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `name` (text) - テンプレート名
      - `description` (text) - テンプレートの説明
      - `brand_type` (text) - 業態タイプ（居酒屋、カフェなど）
      - `is_default` (boolean) - デフォルトテンプレートかどうか
      - `created_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `vendor_assignment_template_items`
      - `id` (uuid, primary key)
      - `template_id` (uuid, foreign key)
      - `vendor_id` (uuid, foreign key)
      - `display_order` (integer)
      - `created_at` (timestamptz)

  2. セキュリティ
    - 各テーブルでRLSを有効化
    - 組織メンバーのみがテンプレートを閲覧・作成・編集できるポリシー
*/

-- テンプレートテーブル
CREATE TABLE IF NOT EXISTS vendor_assignment_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  brand_type text,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- テンプレート項目テーブル
CREATE TABLE IF NOT EXISTS vendor_assignment_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES vendor_assignment_templates(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_vendor_templates_org ON vendor_assignment_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendor_templates_brand ON vendor_assignment_templates(brand_type);
CREATE INDEX IF NOT EXISTS idx_vendor_template_items_template ON vendor_assignment_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_vendor_template_items_vendor ON vendor_assignment_template_items(vendor_id);

-- RLS有効化
ALTER TABLE vendor_assignment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_assignment_template_items ENABLE ROW LEVEL SECURITY;

-- テンプレートのRLSポリシー
CREATE POLICY "Users can view templates in their organization"
  ON vendor_assignment_templates
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can create templates"
  ON vendor_assignment_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "Managers can update templates"
  ON vendor_assignment_templates
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

CREATE POLICY "Managers can delete templates"
  ON vendor_assignment_templates
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
  );

-- テンプレート項目のRLSポリシー
CREATE POLICY "Users can view template items"
  ON vendor_assignment_template_items
  FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM vendor_assignment_templates
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Managers can create template items"
  ON vendor_assignment_template_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    template_id IN (
      SELECT id FROM vendor_assignment_templates
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
      )
    )
  );

CREATE POLICY "Managers can update template items"
  ON vendor_assignment_template_items
  FOR UPDATE
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM vendor_assignment_templates
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
      )
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM vendor_assignment_templates
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
      )
    )
  );

CREATE POLICY "Managers can delete template items"
  ON vendor_assignment_template_items
  FOR DELETE
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM vendor_assignment_templates
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
      )
    )
  );
