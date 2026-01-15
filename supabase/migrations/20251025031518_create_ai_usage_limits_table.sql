/*
  # AI使用制限テーブル作成

  ## 概要
  組織ごとの月間AI使用回数を追跡するテーブルを作成します。

  ## 新規テーブル
  - `ai_usage_limits` テーブル
    - `id` (uuid, primary key) - レコードID
    - `organization_id` (uuid, 外部キー) - 組織ID
    - `month` (date) - 対象月（月初日）
    - `monthly_usage` (integer) - 月間使用回数
    - `created_at` (timestamptz) - 作成日時
    - `updated_at` (timestamptz) - 更新日時
    - ユニーク制約: (organization_id, month)

  ## インデックス
  - 組織IDと月のインデックス

  ## セキュリティ
  - RLS有効化
  - 同じ組織のメンバーのみ閲覧可能
  - 管理者のみ更新可能
*/

-- ============================================
-- 1. ai_usage_limits テーブル作成
-- ============================================

CREATE TABLE IF NOT EXISTS ai_usage_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month date NOT NULL,
  monthly_usage integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_org_month UNIQUE (organization_id, month)
);

-- ============================================
-- 2. インデックス作成
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ai_usage_limits_org_month
ON ai_usage_limits(organization_id, month);

-- ============================================
-- 3. RLS有効化
-- ============================================

ALTER TABLE ai_usage_limits ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLSポリシー作成
-- ============================================

-- 同じ組織のメンバーは閲覧可能
CREATE POLICY "Organization members can view ai usage limits"
ON ai_usage_limits
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- 管理者は更新可能
CREATE POLICY "Admins can update ai usage limits"
ON ai_usage_limits
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id
    FROM organization_members om
    INNER JOIN profiles p ON p.id = om.user_id
    WHERE om.user_id = auth.uid()
    AND p.role = 'admin'
  )
)
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id
    FROM organization_members om
    INNER JOIN profiles p ON p.id = om.user_id
    WHERE om.user_id = auth.uid()
    AND p.role = 'admin'
  )
);

-- 管理者は作成可能
CREATE POLICY "Admins can insert ai usage limits"
ON ai_usage_limits
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id
    FROM organization_members om
    INNER JOIN profiles p ON p.id = om.user_id
    WHERE om.user_id = auth.uid()
    AND p.role = 'admin'
  )
);
