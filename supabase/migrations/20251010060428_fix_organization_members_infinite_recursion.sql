/*
  # organization_members 無限再帰エラーの修正

  ## 問題
  organization_membersテーブルのSELECTポリシーが自分自身を参照して無限再帰が発生
  
  ## 解決策
  - profilesテーブルのorganization_idを直接使用
  - organization_membersのサブクエリを削除
  
  ## 変更内容
  1. organization_membersのSELECTポリシーを完全に再設計
  2. 無限再帰を完全に排除
*/

-- ============================================
-- organization_members の全ポリシーを削除して再作成
-- ============================================

DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Admins can remove members" ON organization_members;

-- SELECTポリシー: profilesテーブルを使用して無限再帰を回避
CREATE POLICY "Members can view organization members"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (
    -- 自分が所属する組織のメンバーは全て見える
    -- profilesテーブルのorganization_idを使用することで無限再帰を回避
    organization_id IN (
      SELECT p.organization_id
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

-- INSERTポリシー: 同様にprofilesテーブルを使用
CREATE POLICY "Admins can add members"
  ON organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      INNER JOIN organization_members om ON om.user_id = p.id
      WHERE p.id = auth.uid()
        AND om.organization_id = organization_members.organization_id
        AND om.role IN ('owner', 'admin')
    )
  );

-- UPDATEポリシー: ownerは変更不可
CREATE POLICY "Admins can update members"
  ON organization_members
  FOR UPDATE
  TO authenticated
  USING (
    role != 'owner'
    AND EXISTS (
      SELECT 1
      FROM profiles p
      INNER JOIN organization_members om ON om.user_id = p.id
      WHERE p.id = auth.uid()
        AND om.organization_id = organization_members.organization_id
        AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    role != 'owner'
    AND EXISTS (
      SELECT 1
      FROM profiles p
      INNER JOIN organization_members om ON om.user_id = p.id
      WHERE p.id = auth.uid()
        AND om.organization_id = organization_members.organization_id
        AND om.role IN ('owner', 'admin')
    )
  );

-- DELETEポリシー: ownerは削除不可
CREATE POLICY "Admins can remove members"
  ON organization_members
  FOR DELETE
  TO authenticated
  USING (
    role != 'owner'
    AND EXISTS (
      SELECT 1
      FROM profiles p
      INNER JOIN organization_members om ON om.user_id = p.id
      WHERE p.id = auth.uid()
        AND om.organization_id = organization_members.organization_id
        AND om.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 確認メッセージ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ organization_members 無限再帰エラー修正完了';
  RAISE NOTICE '✅ profilesテーブルを使用して安全なポリシーに変更';
  RAISE NOTICE '========================================';
END $$;
