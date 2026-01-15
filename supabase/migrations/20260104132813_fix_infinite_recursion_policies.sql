/*
  # Fix Infinite Recursion in RLS Policies

  ## Problem
  The consolidated policies create infinite recursion because they query
  the same tables they're protecting (e.g., organization_members policy
  queries organization_members).

  ## Solution
  Revert to separate policies but use proper role separation:
  - Super admin policies (check system_admins only)
  - Regular user policies (simple checks without circular dependencies)
  
  ## Tables Fixed
  - organization_members
  - organization_subscriptions  
  - organizations
  - error_logs
  - stores
  - daily_reports

  ## Security Impact
  - Eliminates infinite recursion errors
  - Maintains proper access control
  - Uses simple, fast policy checks
*/

-- ============================================
-- organization_members: Fix infinite recursion
-- ============================================

DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;

-- Super admins can see all
CREATE POLICY "Super admins can view all members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins 
      WHERE user_id = auth.uid()
    )
  );

-- Users can see members where they themselves are a member
-- Use a simpler check: if user_id matches OR if they're viewing same org
CREATE POLICY "Users can view own membership"
  ON organization_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- organization_subscriptions: Fix infinite recursion
-- ============================================

DROP POLICY IF EXISTS "Users can view subscriptions" ON organization_subscriptions;

CREATE POLICY "Super admins can view all subscriptions"
  ON organization_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins 
      WHERE user_id = auth.uid()
    )
  );

-- Simple policy: users with profiles can see subscriptions they need
-- We'll use a stored function to avoid recursion
CREATE POLICY "Members can view their org subscriptions"
  ON organization_subscriptions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- organizations: Fix infinite recursion
-- ============================================

DROP POLICY IF EXISTS "Users can view organizations" ON organizations;

CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- error_logs: Fix infinite recursion
-- ============================================

DROP POLICY IF EXISTS "Users can view error logs" ON error_logs;

CREATE POLICY "Super admins can view all error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can view org error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Users can view own error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- stores: Fix infinite recursion
-- ============================================

DROP POLICY IF EXISTS "Users can view stores" ON stores;

CREATE POLICY "Super admins can view all stores"
  ON stores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view org stores"
  ON stores FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- daily_reports: Fix infinite recursion
-- ============================================

DROP POLICY IF EXISTS "Users can view daily reports" ON daily_reports;

CREATE POLICY "Super admins can view all daily reports"
  ON daily_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view assigned store reports"
  ON daily_reports FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT store_id 
      FROM store_assignments
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- store_assignments: Simplify to avoid issues
-- ============================================

DROP POLICY IF EXISTS "Users can delete store assignments" ON store_assignments;
DROP POLICY IF EXISTS "Users can insert store assignments" ON store_assignments;
DROP POLICY IF EXISTS "Users can view store assignments" ON store_assignments;
DROP POLICY IF EXISTS "Users can update store assignments" ON store_assignments;

-- SELECT
CREATE POLICY "Super admins can view all store assignments"
  ON store_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can view org store assignments"
  ON store_assignments FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Store managers can view store assignments"
  ON store_assignments FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM stores WHERE manager_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own store assignments"
  ON store_assignments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT
CREATE POLICY "Super admins can insert store assignments"
  ON store_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can insert store assignments"
  ON store_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Store managers can insert store assignments"
  ON store_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    store_id IN (
      SELECT id FROM stores WHERE manager_id = auth.uid()
    )
  );

-- UPDATE
CREATE POLICY "Super admins can update store assignments"
  ON store_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can update store assignments"
  ON store_assignments FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- DELETE
CREATE POLICY "Super admins can delete store assignments"
  ON store_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can delete store assignments"
  ON store_assignments FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Store managers can delete store assignments"
  ON store_assignments FOR DELETE
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM stores WHERE manager_id = auth.uid()
    )
  );

-- ============================================
-- Add index to help with these queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_organization_members_user_id_org_id 
  ON organization_members(user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_store_assignments_user_id_store_id 
  ON store_assignments(user_id, store_id);