/*
  # profilesテーブルの無限再帰を修正

  ## 問題
  - profiles_select_org_membersポリシーがorganization_membersを参照
  - organization_membersのポリシーがprofilesを参照
  - 循環参照により無限再帰が発生

  ## 解決策
  - organization_membersを参照するポリシーを削除
  - organization_idを直接使用するシンプルなポリシーに変更
  - 自分自身のプロファイルは常に閲覧可能
  - 同じorganization_idを持つプロファイルも閲覧可能
*/

-- ============================================
-- 1. 既存のSELECTポリシーを削除
-- ============================================

DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_select_org_members" ON profiles;

-- ============================================
-- 2. シンプルな新しいSELECTポリシーを作成
-- ============================================

CREATE POLICY "profiles_select_simple"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- 自分自身のプロファイル、または同じ組織のプロファイル
  id = auth.uid() 
  OR 
  (
    organization_id IS NOT NULL 
    AND organization_id = (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  )
);
