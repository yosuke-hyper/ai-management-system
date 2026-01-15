/*
  # organization_membersの無限再帰を修正

  ## 問題
  - SELECTポリシーがorganization_membersテーブル自身を参照して無限再帰を引き起こす

  ## 解決策
  - profilesテーブルのorganization_idを使用してチェック
  - これにより無限再帰を回避
*/

-- ============================================
-- 1. 既存のポリシーを削除
-- ============================================

DROP POLICY IF EXISTS "Members can view their organization members" ON organization_members;

-- ============================================
-- 2. 無限再帰を回避する新しいポリシーを作成
-- ============================================

CREATE POLICY "Members can view their organization members"
ON organization_members
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM profiles
    WHERE id = auth.uid()
    AND organization_id IS NOT NULL
  )
);
