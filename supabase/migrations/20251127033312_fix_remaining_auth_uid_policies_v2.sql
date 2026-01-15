/*
  # Fix remaining auth.uid() RLS policies

  ## 概要
  残りのauth.uid()を使用しているRLSポリシーを最適化します。

  ## 変更内容
  1. auth.uid()を(select auth.uid())に置き換え
  2. Demo tables are simplified to public access

  ## 対象テーブル
  - demo_sessions
  - demo_stores
  - demo_organizations
  - demo_reports  
  - usage_counters
  - organization_invitations
  - audit_logs
  - notifications
  - admin_override_logs
  - brands
  - demo_ai_reports
  - audit_log_settings
  - audit_logs_archive
  - organization_subscriptions
*/

-- ============================================================================
-- demo_sessions - Simplify to full public access
-- ============================================================================

DROP POLICY IF EXISTS "Demo sessions accessible by token" ON demo_sessions;
DROP POLICY IF EXISTS "Demo sessions can update own last_accessed" ON demo_sessions;
DROP POLICY IF EXISTS "Public can access demo via share token" ON demo_sessions;
DROP POLICY IF EXISTS "Public can update demo access count" ON demo_sessions;
DROP POLICY IF EXISTS "Anyone can create demo session" ON demo_sessions;

-- Consolidated policy for demo sessions
CREATE POLICY "Public full access to demo sessions"
  ON demo_sessions FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- demo_stores - Simplify to full public access
-- ============================================================================

DROP POLICY IF EXISTS "Demo stores deletable by demo session" ON demo_stores;
DROP POLICY IF EXISTS "Demo stores updatable by demo session" ON demo_stores;
DROP POLICY IF EXISTS "Anyone can create demo stores" ON demo_stores;
DROP POLICY IF EXISTS "Anyone can read demo stores" ON demo_stores;

-- Consolidated policy for demo stores  
CREATE POLICY "Public full access to demo stores"
  ON demo_stores FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- demo_organizations - Simplify to full public access
-- ============================================================================

DROP POLICY IF EXISTS "Demo orgs deletable by demo session" ON demo_organizations;
DROP POLICY IF EXISTS "Demo orgs updatable by demo session" ON demo_organizations;
DROP POLICY IF EXISTS "Anyone can create demo organization" ON demo_organizations;
DROP POLICY IF EXISTS "Anyone can read demo organizations" ON demo_organizations;

-- Consolidated policy for demo organizations
CREATE POLICY "Public full access to demo organizations"
  ON demo_organizations FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- demo_reports - Simplify to full public access
-- ============================================================================

DROP POLICY IF EXISTS "Demo reports deletable by demo session" ON demo_reports;
DROP POLICY IF EXISTS "Demo reports insertable by demo session" ON demo_reports;
DROP POLICY IF EXISTS "Demo reports updatable by demo session" ON demo_reports;
DROP POLICY IF EXISTS "Anyone can read demo reports" ON demo_reports;

-- Consolidated policy for demo reports
CREATE POLICY "Public full access to demo reports"
  ON demo_reports FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- usage_counters
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view usage counters" ON usage_counters;
DROP POLICY IF EXISTS "System can update usage counters" ON usage_counters;

CREATE POLICY "Admins can view usage counters"
  ON usage_counters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = usage_counters.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- organization_invitations
-- ============================================================================

DROP POLICY IF EXISTS "Organization admins can create invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Organization admins can delete invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Organization admins can update invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Organization members can view invitations" ON organization_invitations;

CREATE POLICY "Organization admins can create invitations"
  ON organization_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = organization_invitations.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Organization admins can delete invitations"
  ON organization_invitations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = organization_invitations.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Organization admins can update invitations"
  ON organization_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = organization_invitations.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = organization_invitations.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Organization members can view invitations"
  ON organization_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = organization_invitations.organization_id
    )
  );

-- ============================================================================
-- audit_logs (remove duplicate policies)
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Organization admins can view audit logs" ON audit_logs;

-- Keep only the optimized versions from earlier migration

-- ============================================================================
-- notifications (remove duplicate policies)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can create notifications for org members" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notification read status" ON notifications;

-- Keep only the optimized versions from earlier migration

-- ============================================================================
-- admin_override_logs
-- ============================================================================

DROP POLICY IF EXISTS "Admins can insert override logs" ON admin_override_logs;
DROP POLICY IF EXISTS "Admins can view own org override logs" ON admin_override_logs;

CREATE POLICY "Admins can insert override logs"
  ON admin_override_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = admin_override_logs.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can view own org override logs"
  ON admin_override_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = admin_override_logs.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- brands (remove duplicate policies)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can create brands" ON brands;
DROP POLICY IF EXISTS "Organization members can view brands" ON brands;

-- Keep only the optimized versions from earlier migration

-- ============================================================================
-- demo_ai_reports - Simplify to full public access
-- ============================================================================

DROP POLICY IF EXISTS "Service role can delete demo AI reports" ON demo_ai_reports;
DROP POLICY IF EXISTS "Service role can insert demo AI reports" ON demo_ai_reports;
DROP POLICY IF EXISTS "Service role can update demo AI reports" ON demo_ai_reports;
DROP POLICY IF EXISTS "Anyone can view demo AI reports" ON demo_ai_reports;

-- Consolidated policy for demo AI reports
CREATE POLICY "Public full access to demo AI reports"
  ON demo_ai_reports FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- audit_log_settings
-- ============================================================================

DROP POLICY IF EXISTS "Organization admins can view audit log settings" ON audit_log_settings;
DROP POLICY IF EXISTS "Organization owners can update audit log settings" ON audit_log_settings;

CREATE POLICY "Organization admins can view audit log settings"
  ON audit_log_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = audit_log_settings.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Organization owners can update audit log settings"
  ON audit_log_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = audit_log_settings.organization_id
      AND organization_members.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = audit_log_settings.organization_id
      AND organization_members.role = 'owner'
    )
  );

-- ============================================================================
-- audit_logs_archive
-- ============================================================================

DROP POLICY IF EXISTS "Organization admins can view archived audit logs" ON audit_logs_archive;

CREATE POLICY "Organization admins can view archived audit logs"
  ON audit_logs_archive FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = audit_logs_archive.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- organization_subscriptions (remove duplicate policies)
-- ============================================================================

DROP POLICY IF EXISTS "Organization members can view subscription" ON organization_subscriptions;
DROP POLICY IF EXISTS "Organization owners can manage subscription" ON organization_subscriptions;

-- Keep only the optimized versions from earlier migration
