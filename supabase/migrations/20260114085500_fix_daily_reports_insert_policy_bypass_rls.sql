/*
  # Fix daily_reports INSERT policy - Direct check without helper function

  1. Problem
    - SECURITY DEFINER function doesn't bypass RLS in Supabase
    - The helper function can't access organization_members due to RLS

  2. Solution
    - Remove the helper function approach
    - Use direct subquery that only accesses the user's own organization_members record
    - The user can always see their own organization_members record (om_select_own policy)

  3. Security
    - Users with store assignment can insert for their assigned stores
    - Organization owners/admins/managers can insert for stores in their org
*/

DROP POLICY IF EXISTS "Users can insert reports" ON daily_reports;

CREATE POLICY "Users can insert reports"
  ON daily_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Option 1: User has store assignment
    EXISTS (
      SELECT 1 FROM store_assignments sa
      WHERE sa.user_id = (SELECT auth.uid())
      AND sa.store_id = daily_reports.store_id
    )
    OR
    -- Option 2: User is owner/admin/manager and store belongs to their organization
    EXISTS (
      SELECT 1 
      FROM organization_members om
      WHERE om.user_id = (SELECT auth.uid())
      AND om.role IN ('owner', 'admin', 'manager')
      AND EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = daily_reports.store_id
        AND s.organization_id = om.organization_id
      )
    )
  );
