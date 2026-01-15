/*
  # AI使用制限設定にmonthly_allocationを追加

  ## 変更内容

  1. テーブル変更
    - `ai_usage_settings` テーブルに以下を追加:
      - `organization_id` (uuid) - 組織ID（マルチテナント対応）
      - `monthly_allocation` (integer) - 月間配分回数（1人あたり）

  2. 既存データのマイグレーション
    - daily_limitをmonthly_allocationに変換（概算: daily_limit * 30）
    - organization_idはNULLを許容（後で組織作成時に設定）

  3. インデックス追加
    - (organization_id, role) の複合ユニーク制約

  4. RLSポリシー更新
    - organization_idに基づいたポリシーに更新

  ## 注意事項
  - 既存の daily_limit カラムは残す（後方互換性のため）
  - 新規レコードは monthly_allocation を優先的に使用
*/

-- ============================================
-- 1. カラム追加
-- ============================================

DO $$
BEGIN
  -- organization_id カラムを追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_usage_settings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE ai_usage_settings
    ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- monthly_allocation カラムを追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_usage_settings' AND column_name = 'monthly_allocation'
  ) THEN
    ALTER TABLE ai_usage_settings
    ADD COLUMN monthly_allocation integer NOT NULL DEFAULT 100;
  END IF;
END $$;

-- ============================================
-- 2. 既存データの変換
-- ============================================

-- daily_limitからmonthly_allocationを計算（概算）
UPDATE ai_usage_settings
SET monthly_allocation = CASE
  WHEN daily_limit = -1 THEN -1  -- 無制限はそのまま
  ELSE daily_limit * 30          -- 日次を月次に変換
END
WHERE monthly_allocation = 100;  -- デフォルト値のもののみ更新

-- ============================================
-- 3. ユニーク制約の変更
-- ============================================

-- 既存のunique_role制約を削除
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_role'
  ) THEN
    ALTER TABLE ai_usage_settings DROP CONSTRAINT unique_role;
  END IF;
END $$;

-- 新しい複合ユニーク制約を追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_org_role'
  ) THEN
    ALTER TABLE ai_usage_settings
    ADD CONSTRAINT unique_org_role UNIQUE (organization_id, role);
  END IF;
END $$;

-- ============================================
-- 4. インデックス追加
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ai_usage_settings_org_id
ON ai_usage_settings(organization_id);

-- ============================================
-- 5. RLSポリシーの更新
-- ============================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view ai usage settings" ON ai_usage_settings;
DROP POLICY IF EXISTS "Admins can update ai usage settings" ON ai_usage_settings;
DROP POLICY IF EXISTS "Admins can insert ai usage settings" ON ai_usage_settings;

-- RLSを有効化（すでに有効な場合はスキップ）
ALTER TABLE ai_usage_settings ENABLE ROW LEVEL SECURITY;

-- 新しいポリシー: 同じ組織のユーザーは設定を閲覧可能
CREATE POLICY "Users can view own org ai usage settings"
ON ai_usage_settings
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
  OR organization_id IS NULL  -- 組織未設定のレコードは全員が閲覧可能（移行期間用）
);

-- 新しいポリシー: 管理者は自分の組織の設定を更新可能
CREATE POLICY "Admins can update own org ai usage settings"
ON ai_usage_settings
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

-- 新しいポリシー: 管理者は自分の組織の設定を作成可能
CREATE POLICY "Admins can insert own org ai usage settings"
ON ai_usage_settings
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

-- ============================================
-- 6. デフォルトデータの更新
-- ============================================

-- 既存の組織ごとにデフォルト設定を作成
-- （organization_idがNULLのレコードが存在する場合、各組織用に複製）
DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM organizations
  LOOP
    -- admin設定
    INSERT INTO ai_usage_settings (organization_id, role, daily_limit, monthly_allocation, enabled)
    VALUES (org.id, 'admin', 20, 150, true)
    ON CONFLICT (organization_id, role) DO NOTHING;

    -- manager設定
    INSERT INTO ai_usage_settings (organization_id, role, daily_limit, monthly_allocation, enabled)
    VALUES (org.id, 'manager', 20, 100, true)
    ON CONFLICT (organization_id, role) DO NOTHING;

    -- staff設定
    INSERT INTO ai_usage_settings (organization_id, role, daily_limit, monthly_allocation, enabled)
    VALUES (org.id, 'staff', 5, 50, true)
    ON CONFLICT (organization_id, role) DO NOTHING;
  END LOOP;
END $$;
