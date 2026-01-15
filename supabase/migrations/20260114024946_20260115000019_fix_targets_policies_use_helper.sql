/*
  # targetsテーブルのポリシーを更新

  1. 問題
    - INSERTとUPDATEポリシーが直接organization_membersを参照
    - 無限再帰の可能性

  2. 解決策
    - ヘルパー関数を使用するように更新
    - is_org_owner_admin_manager()を使用
*/

-- INSERTポリシーを更新
DROP POLICY IF EXISTS "Managers can create targets" ON public.targets;
CREATE POLICY "Managers can create targets" ON public.targets
  FOR INSERT TO authenticated
  WITH CHECK (
    is_org_owner_admin_manager(organization_id)
  );

-- UPDATEポリシーを更新
DROP POLICY IF EXISTS "Managers can update targets" ON public.targets;
CREATE POLICY "Managers can update targets" ON public.targets
  FOR UPDATE TO authenticated
  USING (
    is_org_owner_admin_manager(organization_id)
  )
  WITH CHECK (
    is_org_owner_admin_manager(organization_id)
  );
