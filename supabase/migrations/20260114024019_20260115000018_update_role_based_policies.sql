/*
  # 役割ベースのポリシーを更新

  1. 目的
    - 新しいヘルパー関数を使用してorganization_membersへの直接参照を削減
    - 無限再帰を完全に回避

  2. 対象テーブル
    - stores
    - expense_baselines
    - daily_targets
    - targets
    - report_schedules
    - organization_invitations (admin checks)
    - error_logs
*/

-- stores
DROP POLICY IF EXISTS "Managers can manage stores" ON public.stores;
CREATE POLICY "Managers can manage stores" ON public.stores
  FOR ALL TO authenticated
  USING (
    is_org_owner_admin_manager(organization_id)
  );

-- expense_baselines
DROP POLICY IF EXISTS "Admins and managers can insert expense baselines" ON public.expense_baselines;
CREATE POLICY "Admins and managers can insert expense baselines" ON public.expense_baselines
  FOR INSERT TO authenticated
  WITH CHECK (
    is_org_owner_admin_manager(get_store_organization_id(store_id))
  );

DROP POLICY IF EXISTS "Admins and managers can update expense baselines" ON public.expense_baselines;
CREATE POLICY "Admins and managers can update expense baselines" ON public.expense_baselines
  FOR UPDATE TO authenticated
  USING (
    is_org_owner_admin_manager(get_store_organization_id(store_id))
  );

DROP POLICY IF EXISTS "Admins and managers can delete expense baselines" ON public.expense_baselines;
CREATE POLICY "Admins and managers can delete expense baselines" ON public.expense_baselines
  FOR DELETE TO authenticated
  USING (
    is_org_owner_admin_manager(get_store_organization_id(store_id))
  );

-- daily_targets
DROP POLICY IF EXISTS "Managers can delete daily targets" ON public.daily_targets;
CREATE POLICY "Managers can delete daily targets" ON public.daily_targets
  FOR DELETE TO authenticated
  USING (
    is_org_owner_admin_manager(get_store_organization_id(store_id))
  );

DROP POLICY IF EXISTS "Managers can create daily targets" ON public.daily_targets;
CREATE POLICY "Managers can create daily targets" ON public.daily_targets
  FOR INSERT TO authenticated
  WITH CHECK (
    is_org_owner_admin_manager(get_store_organization_id(store_id))
  );

DROP POLICY IF EXISTS "Managers can update daily targets" ON public.daily_targets;
CREATE POLICY "Managers can update daily targets" ON public.daily_targets
  FOR UPDATE TO authenticated
  USING (
    is_org_owner_admin_manager(get_store_organization_id(store_id))
  );

-- targets
DROP POLICY IF EXISTS "Managers can delete targets" ON public.targets;
CREATE POLICY "Managers can delete targets" ON public.targets
  FOR DELETE TO authenticated
  USING (
    is_org_owner_admin_manager(get_store_organization_id(store_id))
  );

-- report_schedules
DROP POLICY IF EXISTS "Managers can manage schedules" ON public.report_schedules;
CREATE POLICY "Managers can manage schedules" ON public.report_schedules
  FOR ALL TO authenticated
  USING (
    is_org_owner_admin_manager(organization_id)
  );

-- organization_invitations (admin only)
DROP POLICY IF EXISTS "Organization admins can create invitations" ON public.organization_invitations;
CREATE POLICY "Organization admins can create invitations" ON public.organization_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    is_org_owner_or_admin(organization_id)
  );

DROP POLICY IF EXISTS "Organization admins can update invitations" ON public.organization_invitations;
CREATE POLICY "Organization admins can update invitations" ON public.organization_invitations
  FOR UPDATE TO authenticated
  USING (
    is_org_owner_or_admin(organization_id)
  );

DROP POLICY IF EXISTS "Organization admins can delete invitations" ON public.organization_invitations;
CREATE POLICY "Organization admins can delete invitations" ON public.organization_invitations
  FOR DELETE TO authenticated
  USING (
    is_org_owner_or_admin(organization_id)
  );

-- error_logs
DROP POLICY IF EXISTS "Admins can update error logs" ON public.error_logs;
CREATE POLICY "Admins can update error logs" ON public.error_logs
  FOR UPDATE TO authenticated
  USING (
    organization_id IS NOT NULL AND
    is_org_owner_or_admin(organization_id::uuid)
  );

DROP POLICY IF EXISTS "Admins can delete error logs" ON public.error_logs;
CREATE POLICY "Admins can delete error logs" ON public.error_logs
  FOR DELETE TO authenticated
  USING (
    organization_id IS NOT NULL AND
    is_org_owner_or_admin(organization_id::uuid)
  );

-- subscription_contract_history
DROP POLICY IF EXISTS "Admins can insert contract history" ON public.subscription_contract_history;
CREATE POLICY "Admins can insert contract history" ON public.subscription_contract_history
  FOR INSERT TO authenticated
  WITH CHECK (
    is_org_owner_or_admin(organization_id)
  );

-- store_assignments
DROP POLICY IF EXISTS "Org admins/managers can manage store assignments" ON public.store_assignments;
CREATE POLICY "Org admins/managers can manage store assignments" ON public.store_assignments
  FOR ALL TO authenticated
  USING (
    is_org_owner_admin_manager(organization_id)
  );
