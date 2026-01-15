/*
  # デバッグRPC関数 - daily_reports INSERT診断
  
  1. 目的
    - INSERT時のauth状態とRLS条件を診断
    - 認証状態、組織メンバーシップ、システム管理者権限を確認
  
  2. 返り値
    - uid: 現在のユーザーID（nullならanon）
    - role: authenticated / anon
    - org_from_store: 店舗の組織ID
    - is_member: 組織メンバーかどうか
    - is_sys_admin: システム管理者かどうか
  
  3. 使用方法
    ```sql
    SELECT debug_daily_reports_insert('store-uuid-here');
    ```
*/

CREATE OR REPLACE FUNCTION public.debug_daily_reports_insert(p_store_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT jsonb_build_object(
  'uid', auth.uid(),
  'role', auth.role(),
  'org_from_store', public.org_id_for_store(p_store_id),
  'is_member', public.check_org_membership(public.org_id_for_store(p_store_id)),
  'is_sys_admin', EXISTS (
    SELECT 1 FROM public.system_admins sa
    WHERE sa.user_id = auth.uid() AND sa.is_active = true
  )
);
$$;