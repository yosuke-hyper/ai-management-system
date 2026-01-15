/*
  # targets テーブルの RLS を SECURITY DEFINER 関数で修正

  1. 問題
    - INSERT ポリシーの WITH CHECK 句で profiles テーブルを参照
    - profiles テーブル自体もRLSがかかっているため、サブクエリが失敗する可能性

  2. 解決策
    - SECURITY DEFINER 関数を作成して RLS をバイパス
    - この関数は profiles テーブルを直接参照できる
*/

-- 既存のヘルパー関数を削除して再作成
DROP FUNCTION IF EXISTS can_manage_targets(uuid);

-- RLS をバイパスするヘルパー関数を作成
CREATE OR REPLACE FUNCTION can_manage_targets(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = target_org_id
      AND p.role IN ('owner', 'admin', 'manager')
  );
$$;

-- 関数に EXECUTE 権限を付与
GRANT EXECUTE ON FUNCTION can_manage_targets(uuid) TO authenticated;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Managers can create targets" ON targets;
DROP POLICY IF EXISTS "Managers can update targets" ON targets;
DROP POLICY IF EXISTS "Managers can delete targets" ON targets;

-- 新しいポリシーを作成（SECURITY DEFINER 関数を使用）
CREATE POLICY "Managers can create targets"
  ON targets
  FOR INSERT
  TO authenticated
  WITH CHECK (can_manage_targets(organization_id));

CREATE POLICY "Managers can update targets"
  ON targets
  FOR UPDATE
  TO authenticated
  USING (can_manage_targets(organization_id))
  WITH CHECK (can_manage_targets(organization_id));

CREATE POLICY "Managers can delete targets"
  ON targets
  FOR DELETE
  TO authenticated
  USING (can_manage_targets(organization_id));

DO $$
BEGIN
  RAISE NOTICE '✅ targets テーブルの RLS ポリシーを SECURITY DEFINER 関数で修正しました';
END $$;
