/*
  # セキュリティdefiner関数の修正

  1. 問題
    - SECURITY DEFINER関数内でもRLSが適用される可能性

  2. 解決策
    - ポリシーを削除してから関数を再作成
    - その後ポリシーを再作成
*/

-- 依存するポリシーを一時的に削除
DROP POLICY IF EXISTS "om_select_same_org" ON public.organization_members;

-- 関数を削除して再作成
DROP FUNCTION IF EXISTS public.get_user_organizations();

-- RLSをバイパスしてユーザーの組織IDリストを返す
-- SECURITY DEFINER と postgres所有者でRLSをバイパス
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id
  FROM organization_members
  WHERE user_id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_user_organizations() IS 'Returns organization IDs for the current user, bypassing RLS to prevent infinite recursion';

-- ポリシーを再作成
CREATE POLICY "om_select_same_org" ON public.organization_members
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT get_user_organizations())
  );
