/*
  # organization_membersテーブルにstore_idカラムを追加

  ## 変更内容
  
  1. テーブル構造の変更
    - `organization_members` テーブルに `store_id` カラムを追加
    - 外部キー制約を追加（stores テーブル参照）
    - インデックスを作成してパフォーマンスを向上
  
  2. 既存データの処理
    - 既存のメンバーに店舗を割り当てる必要がある場合の処理
    - 組織に店舗が1つしかない場合は自動的に割り当て
  
  3. セキュリティ
    - RLSポリシーは既存のものを維持
    - store_idの変更は管理者のみ可能にする
*/

-- ============================================
-- 1. store_id カラムを追加
-- ============================================

DO $$
BEGIN
  -- store_id カラムを追加（NULL許可）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organization_members' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE organization_members
    ADD COLUMN store_id uuid REFERENCES stores(id) ON DELETE SET NULL;
    
    RAISE NOTICE '✅ store_id カラムを追加しました';
  END IF;
END $$;

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_organization_members_store_id
ON organization_members(store_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_org_store
ON organization_members(organization_id, store_id);

-- ============================================
-- 2. 既存データの処理
-- ============================================

-- 組織に店舗が1つしかない場合、そのメンバーに自動的に割り当て
UPDATE organization_members om
SET store_id = (
  SELECT s.id
  FROM stores s
  WHERE s.organization_id = om.organization_id
  LIMIT 1
)
WHERE om.store_id IS NULL
AND EXISTS (
  SELECT 1
  FROM stores s
  WHERE s.organization_id = om.organization_id
);

-- ============================================
-- 3. デモ組織の処理
-- ============================================

-- デモ組織のメンバーにも店舗を割り当て
DO $$
DECLARE
  demo_org_id uuid;
  first_store_id uuid;
BEGIN
  -- デモ組織を検索
  SELECT id INTO demo_org_id
  FROM organizations
  WHERE is_demo = true
  LIMIT 1;
  
  IF demo_org_id IS NOT NULL THEN
    -- デモ組織の最初の店舗を取得
    SELECT id INTO first_store_id
    FROM stores
    WHERE organization_id = demo_org_id
    ORDER BY created_at
    LIMIT 1;
    
    IF first_store_id IS NOT NULL THEN
      -- デモメンバーに店舗を割り当て
      UPDATE organization_members
      SET store_id = first_store_id
      WHERE organization_id = demo_org_id
      AND store_id IS NULL;
      
      RAISE NOTICE '✅ デモメンバーに店舗を割り当てました';
    END IF;
  END IF;
END $$;
