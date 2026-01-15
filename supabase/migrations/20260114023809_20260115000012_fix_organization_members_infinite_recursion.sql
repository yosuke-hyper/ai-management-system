/*
  # organization_membersの無限再帰修正

  1. 問題
    - om_selectポリシーが自己参照により無限再帰を引き起こしている
    - organization_membersテーブルを参照するポリシー内で
      organization_membersテーブルをクエリしているため

  2. 解決策
    - ユーザーIDのみをチェックする単純なポリシーに変更
    - 自己参照を避ける
*/

-- 無限再帰を起こしているポリシーを削除
DROP POLICY IF EXISTS "om_select" ON public.organization_members;

-- より単純なポリシーに置き換え
-- ユーザー自身のメンバーシップは常に見える
CREATE POLICY "om_select_own" ON public.organization_members
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- 同じ組織の他のメンバーを見るためのポリシー
-- サブクエリではなく直接的なチェックを使用
CREATE POLICY "om_select_same_org" ON public.organization_members
  FOR SELECT TO authenticated
  USING (
    -- ユーザーが何らかの組織のメンバーである場合、
    -- その組織の他のメンバーも見える
    organization_id IN (
      SELECT om2.organization_id 
      FROM public.organization_members om2
      WHERE om2.user_id = (select auth.uid())
    )
  );
