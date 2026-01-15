/*
  # ai_usage_settingsのユニーク制約を修正

  ## 変更内容
  - 既存の`unique_role`制約を削除（roleのみのユニーク制約）
  - 新しい`unique_org_role`制約を追加（organization_id, roleの組み合わせ）

  ## 理由
  - マルチテナント対応のため、同じroleでも異なる組織で存在できる必要がある
  - upsert操作で`ON CONFLICT (organization_id, role)`を使用するため
*/

-- ============================================
-- 1. 既存のユニーク制約を削除
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unique_role'
    AND table_name = 'ai_usage_settings'
  ) THEN
    ALTER TABLE ai_usage_settings DROP CONSTRAINT unique_role;
  END IF;
END $$;

-- ============================================
-- 2. 新しいユニーク制約を追加
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unique_org_role'
    AND table_name = 'ai_usage_settings'
  ) THEN
    ALTER TABLE ai_usage_settings
    ADD CONSTRAINT unique_org_role UNIQUE (organization_id, role);
  END IF;
END $$;
