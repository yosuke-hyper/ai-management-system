/*
  # organization_membersのSELECTポリシーを修正

  ## 変更内容
  - 既存の制限的なSELECTポリシーを削除
  - 同じ組織のメンバー全員を閲覧できる新しいポリシーを追加

  ## 理由
  - 管理画面で組織のメンバー数をカウントする必要がある
  - サブスクリプション制限の確認で全メンバーを見る必要がある
*/

-- ============================================
-- 1. 既存のポリシーを削除
-- ============================================

DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;

-- ============================================
-- 2. 新しいポリシーを作成
-- ============================================

CREATE POLICY "Members can view their organization members"
ON organization_members
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);
