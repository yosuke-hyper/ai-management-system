/*
  # 残りのポリシーをヘルパー関数使用に更新

  1. 目的
    - organization_membersを直接参照する残りのポリシーを更新
    - get_user_organizations()関数を使用

  2. 対象テーブル
    - stores (role-based policies)
    - expense_baselines
    - daily_targets
    - targets
    - report_generation_logs
    - subscription_contract_history
    - report_schedules
    - error_logs
*/

-- storesのrole-based削除ポリシー（ヘルパー関数では役割を取得できないので別の方法）
-- これらは複雑なので既存のまま（organization_membersを参照）

-- expense_baselines: role-based policies
-- 既存のまま（role checkが必要）

-- daily_targets: role-based policies  
-- 既存のまま（role checkが必要）

-- targets: role-based policies
-- 既存のまま（role checkが必要）

-- report_generation_logs
DROP POLICY IF EXISTS "Managers can view logs" ON public.report_generation_logs;
CREATE POLICY "Managers can view logs" ON public.report_generation_logs
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

-- subscription_contract_history
DROP POLICY IF EXISTS "Organization members can view contract history" ON public.subscription_contract_history;
CREATE POLICY "Organization members can view contract history" ON public.subscription_contract_history
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

-- report_schedules (管理者権限が必要なのでこれは既存のまま)

-- error_logsの閲覧ポリシー
DROP POLICY IF EXISTS "Org admins can view org error logs" ON public.error_logs;
CREATE POLICY "Org admins can view org error logs" ON public.error_logs
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id::text
      FROM public.organization_members om
      WHERE om.user_id = (select auth.uid())
        AND om.role IN ('admin', 'owner')
    )
  );
