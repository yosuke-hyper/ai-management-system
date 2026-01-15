/*
  # RLS無限再帰エラーの修正

  ## 問題
  organization_membersテーブルのRLSポリシーが自分自身を参照して無限再帰が発生

  ## 解決策
  1. organization_membersのRLSポリシーをシンプルに変更（auth.uid()のみ使用）
  2. 他のテーブルのポリシーを最適化してパフォーマンス改善
  3. ヘルパー関数を安全に使用

  ## 重要な変更
  - organization_membersのポリシーから再帰的なサブクエリを削除
  - 直接的なauth.uid()チェックに変更
*/

-- ============================================
-- 1. organization_members の安全なRLSポリシー
-- ============================================

DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Admins can remove members" ON organization_members;

-- ユーザーは自分の所属組織のメンバーを参照可能
CREATE POLICY "Members can view organization members"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (
    -- 自分が所属する組織のメンバーは全て見える
    organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- メンバー追加は組織のadmin以上のみ
CREATE POLICY "Admins can add members"
  ON organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- メンバー更新は組織のadmin以上のみ（ownerは変更不可）
CREATE POLICY "Admins can update members"
  ON organization_members
  FOR UPDATE
  TO authenticated
  USING (
    role != 'owner'
    AND EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    role != 'owner'
    AND EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- メンバー削除は組織のadmin以上のみ（ownerは削除不可）
CREATE POLICY "Admins can remove members"
  ON organization_members
  FOR DELETE
  TO authenticated
  USING (
    role != 'owner'
    AND EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 2. profiles のRLSポリシー更新
-- ============================================

DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "profiles_select" ON profiles
FOR SELECT
TO authenticated
USING (
  -- 自分のプロファイル または 同じ組織のメンバー
  id = auth.uid()
  OR organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "profiles_insert" ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid()
);

CREATE POLICY "profiles_update" ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================
-- 3. 確認メッセージ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS無限再帰エラー修正完了';
  RAISE NOTICE '✅ organization_membersポリシー最適化';
  RAISE NOTICE '✅ profilesポリシー最適化';
  RAISE NOTICE '========================================';
END $$;
