/*
  # ポリシーをヘルパー関数使用に更新

  1. 目的
    - organization_membersを直接参照するポリシーを更新
    - get_user_organizations()関数を使用して無限再帰を回避

  2. 対象テーブル
    - profiles
    - organizations
    - organization_subscriptions
    - ai_generated_reports
    - その他organization_membersを参照するテーブル
*/

-- profiles
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
CREATE POLICY "Users can view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

-- organizations
DROP POLICY IF EXISTS "Users can view organizations" ON public.organizations;
CREATE POLICY "Users can view organizations" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT get_user_organizations())
    OR
    EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE user_id = (select auth.uid()) AND is_active = true
    )
  );

-- organization_subscriptions
DROP POLICY IF EXISTS "Users can view subscriptions" ON public.organization_subscriptions;
CREATE POLICY "Users can view subscriptions" ON public.organization_subscriptions
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT get_user_organizations())
    OR
    EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE user_id = (select auth.uid()) AND is_active = true
    )
  );

-- ai_generated_reports
DROP POLICY IF EXISTS "Users can view organization reports" ON public.ai_generated_reports;
CREATE POLICY "Users can view organization reports" ON public.ai_generated_reports
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

DROP POLICY IF EXISTS "Users can insert reports" ON public.ai_generated_reports;
CREATE POLICY "Users can insert reports" ON public.ai_generated_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT get_user_organizations())
  );

DROP POLICY IF EXISTS "Users can update reports" ON public.ai_generated_reports;
CREATE POLICY "Users can update reports" ON public.ai_generated_reports
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

DROP POLICY IF EXISTS "Users can delete reports" ON public.ai_generated_reports;
CREATE POLICY "Users can delete reports" ON public.ai_generated_reports
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = ai_generated_reports.organization_id
        AND om.user_id = (select auth.uid())
        AND om.role IN ('owner', 'admin', 'manager')
    )
  );

-- ai_usage_limits
DROP POLICY IF EXISTS "Users can view usage limits" ON public.ai_usage_limits;
CREATE POLICY "Users can view usage limits" ON public.ai_usage_limits
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

-- ai_usage_tracking
DROP POLICY IF EXISTS "Users can insert usage tracking" ON public.ai_usage_tracking;
CREATE POLICY "Users can insert usage tracking" ON public.ai_usage_tracking
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT get_user_organizations())
  );

DROP POLICY IF EXISTS "Users can view usage tracking" ON public.ai_usage_tracking;
CREATE POLICY "Users can view usage tracking" ON public.ai_usage_tracking
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

-- daily_goal_achievements
DROP POLICY IF EXISTS "Users can view their organization's daily goal achievements" ON public.daily_goal_achievements;
CREATE POLICY "Users can view daily goal achievements" ON public.daily_goal_achievements
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

DROP POLICY IF EXISTS "Users can insert daily goal achievements for their organization" ON public.daily_goal_achievements;
CREATE POLICY "Users can insert daily goal achievements" ON public.daily_goal_achievements
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT get_user_organizations())
  );

DROP POLICY IF EXISTS "Users can update their organization's daily goal achievements" ON public.daily_goal_achievements;
CREATE POLICY "Users can update daily goal achievements" ON public.daily_goal_achievements
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

DROP POLICY IF EXISTS "Users can delete their organization's daily goal achievements" ON public.daily_goal_achievements;
CREATE POLICY "Users can delete daily goal achievements" ON public.daily_goal_achievements
  FOR DELETE TO authenticated
  USING (
    organization_id IN (SELECT get_user_organizations())
  );

-- organization_invitations
DROP POLICY IF EXISTS "Organization members can view invitations" ON public.organization_invitations;
CREATE POLICY "Organization members can view invitations" ON public.organization_invitations
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT get_user_organizations())
  );
