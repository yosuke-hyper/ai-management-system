/*
  # targets テーブルの INSERT ポリシーを直接修正

  1. 問題
    - is_org_owner_admin_manager 関数が RLS の影響で正しく動作しない
    - 複雑な関数参照が無限ループを引き起こす可能性

  2. 解決策
    - INSERT ポリシーを profiles テーブルを直接参照するように変更
    - auth.uid() で自分のプロファイルを取得し、organization_id と role を確認
*/

-- 既存の INSERT ポリシーを削除
DROP POLICY IF EXISTS "Managers can create targets" ON targets;

-- 新しい INSERT ポリシーを作成（直接 profiles を参照）
CREATE POLICY "Managers can create targets"
  ON targets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = targets.organization_id
        AND p.role IN ('owner', 'admin', 'manager')
    )
  );

-- UPDATE ポリシーも同様に修正
DROP POLICY IF EXISTS "Managers can update targets" ON targets;

CREATE POLICY "Managers can update targets"
  ON targets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = targets.organization_id
        AND p.role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = targets.organization_id
        AND p.role IN ('owner', 'admin', 'manager')
    )
  );

-- DELETE ポリシーも修正
DROP POLICY IF EXISTS "Managers can delete targets" ON targets;

CREATE POLICY "Managers can delete targets"
  ON targets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = targets.organization_id
        AND p.role IN ('owner', 'admin', 'manager')
    )
  );

-- profiles テーブルに自分のプロファイルを見れるポリシーを追加
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DO $$
BEGIN
  RAISE NOTICE '✅ targets テーブルのポリシーを修正しました';
  RAISE NOTICE '📋 profiles テーブルを直接参照するように変更';
END $$;
