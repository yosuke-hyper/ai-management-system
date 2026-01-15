/*
  # Fix Security and Performance Issues

  This migration addresses:
  1. Missing foreign key indexes (6 indexes)
  2. RLS policy optimization (80+ policies)
  3. Duplicate index removal
  4. Function search path security
  5. Extension schema migration

  ## Changes

  ### 1. Missing Foreign Key Indexes
  - organization_invitations.invited_by
  - organization_subscriptions.plan_id
  - report_generation_logs (3 foreign keys)
  - report_schedules.store_id

  ### 2. RLS Policy Optimization
  - Replace auth.uid() with (SELECT auth.uid())
  - Prevents re-evaluation for each row
  - Improves query performance at scale

  ### 3. Duplicate Index Cleanup
  - Remove redundant indexes on same columns
  - Keep primary/unique constraint indexes

  ### 4. Function Security
  - Set immutable search_path for all functions
  - Prevents search_path hijacking attacks

  ### 5. Extension Migration
  - Move pg_trgm from public to extensions schema
*/

-- =====================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- organization_invitations.invited_by
CREATE INDEX IF NOT EXISTS idx_organization_invitations_invited_by
  ON organization_invitations(invited_by);

-- organization_subscriptions.plan_id
CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_plan_id
  ON organization_subscriptions(plan_id);

-- report_generation_logs foreign keys
CREATE INDEX IF NOT EXISTS idx_report_generation_logs_report_id
  ON report_generation_logs(report_id);

CREATE INDEX IF NOT EXISTS idx_report_generation_logs_schedule_id
  ON report_generation_logs(schedule_id);

CREATE INDEX IF NOT EXISTS idx_report_generation_logs_store_id_fk
  ON report_generation_logs(store_id);

-- report_schedules.store_id
CREATE INDEX IF NOT EXISTS idx_report_schedules_store_id_fk
  ON report_schedules(store_id);


-- =====================================================
-- 2. REMOVE DUPLICATE INDEXES
-- =====================================================

-- daily_report_vendor_purchases duplicates
DROP INDEX IF EXISTS idx_vendor_purchases_report;
DROP INDEX IF EXISTS idx_vendor_purchases_vendor;
-- Keep: daily_report_vendor_purchases_report_id_idx, daily_report_vendor_purchases_vendor_id_idx

-- monthly_expenses duplicates
DROP INDEX IF EXISTS monthly_expenses_store_month_idx;
-- Keep: idx_monthly_expenses_store_month

-- profiles duplicates
DROP INDEX IF EXISTS profiles_email_idx;
DROP INDEX IF EXISTS profiles_role_idx;
DROP INDEX IF EXISTS uniq_profiles_email;
-- Keep: idx_profiles_email, idx_profiles_role, profiles_email_key

-- store_assignments duplicates
DROP INDEX IF EXISTS store_assignments_user_idx;
DROP INDEX IF EXISTS store_assignments_store_idx;
DROP INDEX IF EXISTS uniq_store_assignment;
-- Keep: idx_store_assignments_user, idx_store_assignments_store, store_assignments_user_id_store_id_key

-- store_vendor_assignments duplicates
DROP INDEX IF EXISTS store_vendor_assignments_vendor_id_idx;
DROP INDEX IF EXISTS uniq_store_vendor;
-- Keep: idx_store_vendor_vendor, store_vendor_assignments_store_id_vendor_id_key

-- targets duplicates
DROP INDEX IF EXISTS targets_store_id_period_key;
-- Keep: idx_targets_store_period


-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - STORES
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage stores" ON stores;
CREATE POLICY "Admins can manage stores" ON stores
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin')
    )
  );


-- =====================================================
-- 4. OPTIMIZE RLS POLICIES - STORE_ASSIGNMENTS
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage store assignments" ON store_assignments;
CREATE POLICY "Admins can manage store assignments" ON store_assignments
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can read own store assignments" ON store_assignments;
CREATE POLICY "Users can read own store assignments" ON store_assignments
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));


-- =====================================================
-- 5. OPTIMIZE RLS POLICIES - DAILY_REPORTS
-- =====================================================

DROP POLICY IF EXISTS "Users can insert reports for assigned stores" ON daily_reports;
DROP POLICY IF EXISTS dr_insert ON daily_reports;
CREATE POLICY "Users can insert reports for assigned stores" ON daily_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM store_assignments
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can read reports for assigned stores" ON daily_reports;
DROP POLICY IF EXISTS dr_select ON daily_reports;
CREATE POLICY "Users can read reports for assigned stores" ON daily_reports
  FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM store_assignments
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own reports for assigned stores" ON daily_reports;
DROP POLICY IF EXISTS dr_update ON daily_reports;
CREATE POLICY "Users can update own reports for assigned stores" ON daily_reports
  FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT auth.uid()) AND
    store_id IN (
      SELECT store_id FROM store_assignments
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS dr_delete ON daily_reports;
CREATE POLICY "Users can delete own reports" ON daily_reports
  FOR DELETE TO authenticated
  USING (
    created_by = (SELECT auth.uid()) AND
    store_id IN (
      SELECT store_id FROM store_assignments
      WHERE user_id = (SELECT auth.uid())
    )
  );


-- =====================================================
-- 6. OPTIMIZE RLS POLICIES - AI_MESSAGES
-- =====================================================

DROP POLICY IF EXISTS "Users can create messages in own conversations" ON ai_messages;
CREATE POLICY "Users can create messages in own conversations" ON ai_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM ai_conversations
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view messages in own conversations" ON ai_messages;
CREATE POLICY "Users can view messages in own conversations" ON ai_messages
  FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM ai_conversations
      WHERE user_id = (SELECT auth.uid())
    )
  );


-- =====================================================
-- 7. OPTIMIZE RLS POLICIES - DAILY_REPORT_VENDOR_PURCHASES
-- =====================================================

DROP POLICY IF EXISTS "Users can delete own vendor purchases" ON daily_report_vendor_purchases;
DROP POLICY IF EXISTS drvp_delete ON daily_report_vendor_purchases;
CREATE POLICY "Users can delete own vendor purchases" ON daily_report_vendor_purchases
  FOR DELETE TO authenticated
  USING (
    report_id IN (
      SELECT id FROM daily_reports
      WHERE created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert vendor purchases for accessible stores" ON daily_report_vendor_purchases;
DROP POLICY IF EXISTS "Users can insert vendor purchases for own reports" ON daily_report_vendor_purchases;
DROP POLICY IF EXISTS drvp_insert ON daily_report_vendor_purchases;
CREATE POLICY "Users can insert vendor purchases" ON daily_report_vendor_purchases
  FOR INSERT TO authenticated
  WITH CHECK (
    report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN store_assignments sa ON dr.store_id = sa.store_id
      WHERE sa.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can read vendor purchases for accessible stores" ON daily_report_vendor_purchases;
DROP POLICY IF EXISTS "Users can view vendor purchases for accessible reports" ON daily_report_vendor_purchases;
DROP POLICY IF EXISTS drvp_select ON daily_report_vendor_purchases;
CREATE POLICY "Users can read vendor purchases" ON daily_report_vendor_purchases
  FOR SELECT TO authenticated
  USING (
    report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN store_assignments sa ON dr.store_id = sa.store_id
      WHERE sa.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own vendor purchases" ON daily_report_vendor_purchases;
DROP POLICY IF EXISTS "Users can update vendor purchases for accessible stores" ON daily_report_vendor_purchases;
DROP POLICY IF EXISTS drvp_update ON daily_report_vendor_purchases;
CREATE POLICY "Users can update vendor purchases" ON daily_report_vendor_purchases
  FOR UPDATE TO authenticated
  USING (
    report_id IN (
      SELECT id FROM daily_reports
      WHERE created_by = (SELECT auth.uid())
    )
  );


-- =====================================================
-- 8. OPTIMIZE RLS POLICIES - AI_CONVERSATIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can create own conversations" ON ai_conversations;
CREATE POLICY "Users can create own conversations" ON ai_conversations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own conversations" ON ai_conversations;
CREATE POLICY "Users can delete own conversations" ON ai_conversations
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own conversations" ON ai_conversations;
CREATE POLICY "Users can update own conversations" ON ai_conversations
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own conversations" ON ai_conversations;
CREATE POLICY "Users can view own conversations" ON ai_conversations
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));


-- =====================================================
-- 9. OPTIMIZE RLS POLICIES - SUMMARY_DATA
-- =====================================================

DROP POLICY IF EXISTS "Users can read summary data for assigned stores" ON summary_data;
DROP POLICY IF EXISTS "Users can view summary for assigned stores" ON summary_data;
CREATE POLICY "Users can view summary for assigned stores" ON summary_data
  FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM store_assignments
      WHERE user_id = (SELECT auth.uid())
    )
  );


-- =====================================================
-- 10. OPTIMIZE RLS POLICIES - VENDORS
-- =====================================================

DROP POLICY IF EXISTS vendors_delete_policy ON vendors;
CREATE POLICY vendors_delete_policy ON vendors
  FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS vendors_insert_policy ON vendors;
CREATE POLICY vendors_insert_policy ON vendors
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS vendors_select_policy ON vendors;
CREATE POLICY vendors_select_policy ON vendors
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS vendors_update_policy ON vendors;
CREATE POLICY vendors_update_policy ON vendors
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin')
    )
  );


-- =====================================================
-- 11. OPTIMIZE RLS POLICIES - MONTHLY_EXPENSES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage monthly expenses for assigned stores" ON monthly_expenses;
CREATE POLICY "Users can manage monthly expenses" ON monthly_expenses
  FOR ALL TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM store_assignments
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can read monthly expenses for assigned stores" ON monthly_expenses;


-- =====================================================
-- 12. OPTIMIZE RLS POLICIES - DAILY_TARGETS
-- =====================================================

DROP POLICY IF EXISTS "Admins can create daily targets" ON daily_targets;
DROP POLICY IF EXISTS "Managers can create their store daily targets" ON daily_targets;
CREATE POLICY "Authorized users can create daily targets" ON daily_targets
  FOR INSERT TO authenticated
  WITH CHECK (
    store_id IN (
      SELECT s.id FROM stores s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = (SELECT auth.uid())
      AND (om.role IN ('owner', 'admin') OR s.manager_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Admins can delete daily targets" ON daily_targets;
DROP POLICY IF EXISTS "Managers can delete their store daily targets" ON daily_targets;
CREATE POLICY "Authorized users can delete daily targets" ON daily_targets
  FOR DELETE TO authenticated
  USING (
    store_id IN (
      SELECT s.id FROM stores s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = (SELECT auth.uid())
      AND (om.role IN ('owner', 'admin') OR s.manager_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Admins can update daily targets" ON daily_targets;
DROP POLICY IF EXISTS "Managers can update their store daily targets" ON daily_targets;
CREATE POLICY "Authorized users can update daily targets" ON daily_targets
  FOR UPDATE TO authenticated
  USING (
    store_id IN (
      SELECT s.id FROM stores s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = (SELECT auth.uid())
      AND (om.role IN ('owner', 'admin') OR s.manager_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Admins can view all daily targets" ON daily_targets;
DROP POLICY IF EXISTS "Managers and staff can view their store daily targets" ON daily_targets;
CREATE POLICY "Users can view daily targets" ON daily_targets
  FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM store_assignments
      WHERE user_id = (SELECT auth.uid())
    )
  );


-- =====================================================
-- 13. OPTIMIZE RLS POLICIES - ORGANIZATION_SUBSCRIPTIONS
-- =====================================================

DROP POLICY IF EXISTS "Organization members can view subscription" ON organization_subscriptions;
DROP POLICY IF EXISTS "Organization owners can manage subscription" ON organization_subscriptions;

CREATE POLICY "Organization members can view subscription" ON organization_subscriptions
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Organization owners can manage subscription" ON organization_subscriptions
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
      AND role = 'owner'
    )
  );


-- =====================================================
-- 14. OPTIMIZE RLS POLICIES - TARGETS
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete targets" ON targets;
DROP POLICY IF EXISTS "Managers can delete targets" ON targets;
CREATE POLICY "Authorized users can delete targets" ON targets
  FOR DELETE TO authenticated
  USING (
    store_id IN (
      SELECT s.id FROM stores s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = (SELECT auth.uid())
      AND (om.role IN ('owner', 'admin') OR s.manager_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Managers can create targets" ON targets;
CREATE POLICY "Managers can create targets" ON targets
  FOR INSERT TO authenticated
  WITH CHECK (
    store_id IN (
      SELECT s.id FROM stores s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = (SELECT auth.uid())
      AND (om.role IN ('owner', 'admin') OR s.manager_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Managers can update targets" ON targets;
CREATE POLICY "Managers can update targets" ON targets
  FOR UPDATE TO authenticated
  USING (
    store_id IN (
      SELECT s.id FROM stores s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = (SELECT auth.uid())
      AND (om.role IN ('owner', 'admin') OR s.manager_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can view targets for accessible stores" ON targets;
DROP POLICY IF EXISTS "Users can view targets for assigned stores" ON targets;
CREATE POLICY "Users can view targets" ON targets
  FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM store_assignments
      WHERE user_id = (SELECT auth.uid())
    )
  );


-- =====================================================
-- 15. OPTIMIZE RLS POLICIES - DEMO_SESSIONS
-- =====================================================

DROP POLICY IF EXISTS "Demo sessions accessible by token" ON demo_sessions;
CREATE POLICY "Demo sessions accessible by token" ON demo_sessions
  FOR SELECT TO anon, authenticated
  USING (expires_at > now());

DROP POLICY IF EXISTS "Demo sessions can update own last_accessed" ON demo_sessions;
CREATE POLICY "Demo sessions can update own last_accessed" ON demo_sessions
  FOR UPDATE TO anon, authenticated
  USING (expires_at > now());


-- =====================================================
-- 16. OPTIMIZE RLS POLICIES - AI_USAGE_LIMITS
-- =====================================================

DROP POLICY IF EXISTS "Admins can insert ai usage limits" ON ai_usage_limits;
CREATE POLICY "Admins can insert ai usage limits" ON ai_usage_limits
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update ai usage limits" ON ai_usage_limits;
CREATE POLICY "Admins can update ai usage limits" ON ai_usage_limits
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Organization members can view ai usage limits" ON ai_usage_limits;
CREATE POLICY "Organization members can view ai usage limits" ON ai_usage_limits
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
    )
  );


-- =====================================================
-- 17. OPTIMIZE RLS POLICIES - DEMO TABLES
-- =====================================================

DROP POLICY IF EXISTS "Demo orgs deletable by demo session" ON demo_organizations;
DROP POLICY IF EXISTS "Demo orgs updatable by demo session" ON demo_organizations;

DROP POLICY IF EXISTS "Demo stores deletable by demo session" ON demo_stores;
DROP POLICY IF EXISTS "Demo stores updatable by demo session" ON demo_stores;

DROP POLICY IF EXISTS "Demo reports deletable by demo session" ON demo_reports;
DROP POLICY IF EXISTS "Demo reports insertable by demo session" ON demo_reports;
DROP POLICY IF EXISTS "Demo reports updatable by demo session" ON demo_reports;


-- =====================================================
-- 18. OPTIMIZE RLS POLICIES - AI_USAGE_SETTINGS
-- =====================================================

DROP POLICY IF EXISTS "Admins can update usage settings" ON ai_usage_settings;
CREATE POLICY "Admins can update usage settings" ON ai_usage_settings
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin')
    )
  );


-- =====================================================
-- 19. OPTIMIZE RLS POLICIES - AI_GENERATED_REPORTS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can update their accessible reports" ON ai_generated_reports;
CREATE POLICY "Authenticated users can update their accessible reports" ON ai_generated_reports
  FOR UPDATE TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM store_assignments
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can view reports for their stores" ON ai_generated_reports;
CREATE POLICY "Managers can view reports for their stores" ON ai_generated_reports
  FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT id FROM stores
      WHERE manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Staff can view reports for their store" ON ai_generated_reports;
CREATE POLICY "Staff can view reports for their store" ON ai_generated_reports
  FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM store_assignments
      WHERE user_id = (SELECT auth.uid())
    )
  );


-- =====================================================
-- 20. OPTIMIZE RLS POLICIES - AI_USAGE_TRACKING
-- =====================================================

DROP POLICY IF EXISTS "Users can create own usage tracking" ON ai_usage_tracking;
CREATE POLICY "Users can create own usage tracking" ON ai_usage_tracking
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own usage tracking" ON ai_usage_tracking;
CREATE POLICY "Users can update own usage tracking" ON ai_usage_tracking
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own usage tracking" ON ai_usage_tracking;
CREATE POLICY "Users can view own usage tracking" ON ai_usage_tracking
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));


-- =====================================================
-- 21. OPTIMIZE RLS POLICIES - USAGE_COUNTERS
-- =====================================================

DROP POLICY IF EXISTS "Admins can view usage counters" ON usage_counters;
CREATE POLICY "Admins can view usage counters" ON usage_counters
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin')
    )
  );


-- =====================================================
-- 22. OPTIMIZE RLS POLICIES - ORGANIZATION_MEMBERS
-- =====================================================

DROP POLICY IF EXISTS "Users can delete own membership" ON organization_members;
CREATE POLICY "Users can delete own membership" ON organization_members
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can manage own membership" ON organization_members;
CREATE POLICY "Users can manage own membership" ON organization_members
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()));


-- =====================================================
-- 23. OPTIMIZE RLS POLICIES - ORGANIZATIONS
-- =====================================================

DROP POLICY IF EXISTS "Members can view their organization" ON organizations;
CREATE POLICY "Members can view their organization" ON organizations
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners and admins can update organization" ON organizations;
CREATE POLICY "Owners and admins can update organization" ON organizations
  FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin')
    )
  );


-- =====================================================
-- 24. OPTIMIZE RLS POLICIES - PROFILES
-- =====================================================

DROP POLICY IF EXISTS profiles_insert ON profiles;
CREATE POLICY profiles_insert ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid()) OR
    id IN (
      SELECT om2.user_id FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()));


-- =====================================================
-- 25. OPTIMIZE RLS POLICIES - ORGANIZATION_INVITATIONS
-- =====================================================

DROP POLICY IF EXISTS "Organization admins can create invitations" ON organization_invitations;
CREATE POLICY "Organization admins can create invitations" ON organization_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Organization admins can delete invitations" ON organization_invitations;
CREATE POLICY "Organization admins can delete invitations" ON organization_invitations
  FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Organization admins can update invitations" ON organization_invitations;
CREATE POLICY "Organization admins can update invitations" ON organization_invitations
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Organization members can view invitations" ON organization_invitations;
CREATE POLICY "Organization members can view invitations" ON organization_invitations
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
    )
  );


-- =====================================================
-- 26. OPTIMIZE RLS POLICIES - AUDIT_LOGS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Organization admins can view audit logs" ON audit_logs;
CREATE POLICY "Organization admins can view audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin')
    )
  );


-- =====================================================
-- 27. FIX FUNCTION SEARCH PATHS
-- =====================================================

-- Set secure search_path for all functions
ALTER FUNCTION auto_accept_terms_on_profile_creation() SET search_path = '';
ALTER FUNCTION is_admin() SET search_path = '';
ALTER FUNCTION set_updated_at() SET search_path = '';
ALTER FUNCTION increment_usage_counter(uuid, text, integer) SET search_path = '';
ALTER FUNCTION update_updated_at_column() SET search_path = '';
ALTER FUNCTION get_user_organization_id() SET search_path = '';
ALTER FUNCTION is_organization_owner(uuid) SET search_path = '';
ALTER FUNCTION is_organization_admin(uuid) SET search_path = '';
ALTER FUNCTION enforce_demo_quota() SET search_path = '';
ALTER FUNCTION purge_expired_demos() SET search_path = '';
ALTER FUNCTION get_demo_status(uuid) SET search_path = '';
ALTER FUNCTION expire_old_invitations() SET search_path = '';
ALTER FUNCTION handle_new_user() SET search_path = '';
ALTER FUNCTION create_audit_log(uuid, uuid, text, text, text, jsonb, text, text) SET search_path = '';
ALTER FUNCTION cleanup_expired_demo_sessions() SET search_path = '';
ALTER FUNCTION accept_terms_and_privacy(uuid) SET search_path = '';


-- =====================================================
-- 28. MOVE PG_TRGM TO EXTENSIONS SCHEMA
-- =====================================================

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_trgm extension
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
END $$;

-- Update index to use extensions schema
DROP INDEX IF EXISTS idx_ai_messages_trgm;
CREATE INDEX IF NOT EXISTS idx_ai_messages_trgm
  ON ai_messages USING gin (content extensions.gin_trgm_ops);
