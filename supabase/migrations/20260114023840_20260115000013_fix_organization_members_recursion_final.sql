/*
  # organization_membersの無限再帰を完全に修正

  1. 問題
    - organization_membersポリシーが自己参照により無限再帰
    - 他のテーブルのポリシーがorganization_membersを参照するため連鎖的に影響

  2. 解決策
    - セキュリティdefiner関数を作成してRLSをバイパス
    - organization_membersのSELECTポリシーを単純化
*/

-- ユーザーの組織IDリストを返すセキュリティdefiner関数
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS TABLE(organization_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT om.organization_id
  FROM public.organization_members om
  WHERE om.user_id = auth.uid();
END;
$$;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "om_select_own" ON public.organization_members;
DROP POLICY IF EXISTS "om_select_same_org" ON public.organization_members;

-- 新しいシンプルなポリシー
-- ユーザー自身のメンバーシップ
CREATE POLICY "om_select_own" ON public.organization_members
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- 同じ組織の他のメンバー（セキュリティdefiner関数を使用）
CREATE POLICY "om_select_same_org" ON public.organization_members
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

-- スーパー管理者は全て見える
CREATE POLICY "om_select_superadmin" ON public.organization_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins sa
      WHERE sa.user_id = (select auth.uid()) AND sa.is_active = true
    )
  );
