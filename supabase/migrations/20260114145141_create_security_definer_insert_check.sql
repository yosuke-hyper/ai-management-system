/*
  # 日報INSERT権限チェック - SECURITY DEFINER版
  
  1. 目的
    - RLS連鎖を完全回避
    - 確実な権限チェック
    - デバッグ可能な構造
  
  2. チェック内容
    - 認証済みユーザー
    - 店舗の組織メンバー（owner/admin/member）
    - またはシステム管理者
  
  3. 特徴
    - SECURITY DEFINER: 関数所有者の権限で実行
    - row_security=off: RLSの影響を受けない
    - search_path=public: スキーマ明示で安全
*/

-- 既存の関数を削除
DROP FUNCTION IF EXISTS public.can_insert_daily_report(uuid);

-- 新しいSECURITY DEFINER関数を作成
CREATE FUNCTION public.can_insert_daily_report(p_store_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_org uuid;
  v_uid uuid;
BEGIN
  -- 認証チェック
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- 店舗から組織IDを取得
  SELECT s.organization_id INTO v_org
  FROM public.stores s
  WHERE s.id = p_store_id;

  IF v_org IS NULL THEN
    RETURN false;
  END IF;

  -- 組織メンバーチェック OR システム管理者チェック
  RETURN
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = v_org
        AND om.user_id = v_uid
        AND om.role = ANY(ARRAY['owner','admin','member'])
    )
    OR EXISTS (
      SELECT 1 FROM public.system_admins sa
      WHERE sa.user_id = v_uid
        AND sa.is_active = true
    );
END;
$$;

-- 権限設定
REVOKE ALL ON FUNCTION public.can_insert_daily_report(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_insert_daily_report(uuid) TO authenticated;

-- daily_reportsの既存INSERT policyを削除して新しいものを作成
DROP POLICY IF EXISTS "Users can insert reports" ON public.daily_reports;
DROP POLICY IF EXISTS "Allow insert for org members and sys admins" ON public.daily_reports;
DROP POLICY IF EXISTS "Allow insert for authenticated users in org" ON public.daily_reports;
DROP POLICY IF EXISTS "simple org check for insert" ON public.daily_reports;

-- 新しいシンプルなINSERT policy
CREATE POLICY "Users can insert reports"
ON public.daily_reports
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_insert_daily_report(store_id)
);