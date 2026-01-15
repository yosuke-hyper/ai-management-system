/*
  # organization_membersポリシーを単純化

  1. 問題
    - om_select_same_org が get_user_organizations() を使用
    - get_user_organizations() が organization_members をクエリ
    - 循環参照による無限再帰

  2. 解決策
    - om_select_same_org を削除
    - 必要な場合のみユーザー自身のメンバーシップを参照
*/

-- 循環参照を起こしているポリシーを削除
DROP POLICY IF EXISTS "om_select_same_org" ON public.organization_members;

-- スーパー管理者は全メンバーシップを見える
DROP POLICY IF EXISTS "om_select_superadmin" ON public.organization_members;
CREATE POLICY "om_select_superadmin" ON public.organization_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins sa
      WHERE sa.user_id = (select auth.uid()) AND sa.is_active = true
    )
  );

-- get_user_organizations() 関数の実装を、RLSを完全にバイパスするように変更
-- まず、既存の関数の実装を確認して、CREATE OR REPLACEで上書き
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- RLSを完全にバイパスするために、SECURITY DEFINERを使用
  -- この関数内では、RLSポリシーは適用されない
  RETURN QUERY
  SELECT om.organization_id
  FROM organization_members om
  WHERE om.user_id = auth.uid();
END;
$$;

-- 関数の所有者をpostgresに設定することでRLSを確実にバイパス
-- (これは管理者権限が必要なため、エラーになる可能性あり)
-- ALTER FUNCTION public.get_user_organizations() OWNER TO postgres;

COMMENT ON FUNCTION public.get_user_organizations() IS 'Returns organization IDs for current user. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';
