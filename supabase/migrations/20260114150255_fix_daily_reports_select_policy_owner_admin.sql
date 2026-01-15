/*
  # 日報SELECT権限の拡張 - owner/admin対応
  
  1. 問題
    - INSERT は成功しているが `.select('*')` で返却時に失敗
    - 現在の SELECT ポリシーは store_assignments のみ
    - owner/admin は store_assignments がなくても見れるべき
  
  2. 解決策
    - SELECT ポリシーに organization の owner/admin を追加
    - システム管理者も引き続き許可
  
  3. 許可する条件
    - 店舗に割り当てられているユーザー
    - または組織の owner/admin
    - またはシステム管理者
*/

-- 既存の SELECT ポリシーを削除
DROP POLICY IF EXISTS "Users can view reports" ON public.daily_reports;
DROP POLICY IF EXISTS "Users can select daily reports" ON public.daily_reports;
DROP POLICY IF EXISTS "Users can view own reports" ON public.daily_reports;

-- 新しい拡張 SELECT ポリシー
CREATE POLICY "Users can view reports"
ON public.daily_reports
FOR SELECT
TO authenticated
USING (
  -- 1) 店舗割り当てがある
  EXISTS (
    SELECT 1
    FROM public.store_assignments sa
    WHERE sa.user_id = auth.uid()
      AND sa.store_id = daily_reports.store_id
  )
  -- 2) 組織の owner/admin（重要な追加）
  OR EXISTS (
    SELECT 1
    FROM public.stores s
    JOIN public.organization_members om
      ON om.organization_id = s.organization_id
    WHERE s.id = daily_reports.store_id
      AND om.user_id = auth.uid()
      AND om.role = ANY(ARRAY['owner','admin'])
  )
  -- 3) システム管理者
  OR EXISTS (
    SELECT 1
    FROM public.system_admins sys
    WHERE sys.user_id = auth.uid()
      AND sys.is_active = true
  )
);