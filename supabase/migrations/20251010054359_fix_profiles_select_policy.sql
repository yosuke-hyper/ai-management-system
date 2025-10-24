/*
  # profilesテーブルのSELECTポリシー修正

  ## 問題
  profiles_selectポリシーがorganization_membersを参照し、
  フロントエンドからprofilesが取得できない

  ## 解決策
  自分のprofileは常に読める、シンプルなポリシーに変更
*/

-- 既存のSELECTポリシーを削除
DROP POLICY IF EXISTS "profiles_select" ON profiles;

-- 新しいシンプルなポリシー：自分のprofileは常に読める
CREATE POLICY "profiles_select" ON profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
);

-- 管理者は他のユーザーのprofilesも読める（別ポリシーとして追加）
CREATE POLICY "profiles_select_org_members" ON profiles
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id
    FROM organization_members om
    WHERE om.user_id = auth.uid()
  )
);

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ profilesのSELECTポリシーを修正しました';
  RAISE NOTICE '✅ 自分のprofileは必ず読めるようになりました';
  RAISE NOTICE '========================================';
END $$;
