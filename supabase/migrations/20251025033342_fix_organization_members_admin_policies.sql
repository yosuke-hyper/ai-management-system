/*
  # organization_membersの管理者ポリシーを修正

  ## 変更内容
  - INSERT, UPDATE, DELETEポリシーを管理者のみに制限
  - profilesテーブルを参照して無限再帰を回避

  ## セキュリティ
  - 管理者のみがメンバーの追加・更新・削除が可能
  - 同じ組織の管理者のみが操作可能
*/

-- ============================================
-- 1. 既存のポリシーを削除
-- ============================================

DROP POLICY IF EXISTS "Admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Admins can remove members" ON organization_members;

-- ============================================
-- 2. 管理者用の新しいポリシーを作成
-- ============================================

-- INSERT: 管理者のみが自分の組織にメンバーを追加可能
CREATE POLICY "Admins can add members"
ON organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.organization_id = organization_members.organization_id
  )
);

-- UPDATE: 管理者のみが自分の組織のメンバーを更新可能
CREATE POLICY "Admins can update members"
ON organization_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.organization_id = organization_members.organization_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.organization_id = organization_members.organization_id
  )
);

-- DELETE: 管理者のみが自分の組織のメンバーを削除可能
CREATE POLICY "Admins can remove members"
ON organization_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.organization_id = organization_members.organization_id
  )
);
