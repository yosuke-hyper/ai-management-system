/*
  # targets RLS を organization_members で修正 v2

  1. 問題
    - profiles テーブルの RLS が干渉している可能性
    
  2. 解決策
    - organization_members テーブルを直接参照する
    - CASCADE で依存関係を解決
*/

-- まずポリシーを削除
DROP POLICY IF EXISTS "Managers can create targets" ON targets;
DROP POLICY IF EXISTS "Managers can update targets" ON targets;
DROP POLICY IF EXISTS "Managers can delete targets" ON targets;

-- 既存の関数を削除
DROP FUNCTION IF EXISTS can_manage_targets(uuid);
DROP FUNCTION IF EXISTS debug_can_manage_targets(uuid);

-- organization_members を使う新しい関数
CREATE OR REPLACE FUNCTION can_manage_targets(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = target_org_id
      AND om.role IN ('owner', 'admin', 'manager')
  );
$$;

GRANT EXECUTE ON FUNCTION can_manage_targets(uuid) TO authenticated;

-- デバッグ関数
CREATE OR REPLACE FUNCTION debug_can_manage_targets(target_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  member_data jsonb;
  result boolean;
BEGIN
  current_user_id := auth.uid();
  
  SELECT jsonb_build_object(
    'user_id', om.user_id,
    'organization_id', om.organization_id,
    'role', om.role,
    'matches_org', (om.organization_id = target_org_id),
    'role_ok', (om.role IN ('owner', 'admin', 'manager'))
  ) INTO member_data
  FROM organization_members om
  WHERE om.user_id = current_user_id
    AND om.organization_id = target_org_id;
  
  result := EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = current_user_id
      AND om.organization_id = target_org_id
      AND om.role IN ('owner', 'admin', 'manager')
  );
  
  RETURN jsonb_build_object(
    'auth_uid', current_user_id,
    'target_org_id', target_org_id,
    'member_data', member_data,
    'can_manage', result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION debug_can_manage_targets(uuid) TO authenticated;

-- ポリシーを再作成
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
  RAISE NOTICE '✅ can_manage_targets を organization_members 参照に変更しました';
END $$;
