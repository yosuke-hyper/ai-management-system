/*
  # Simplify daily_reports INSERT policy

  1. Problem
    - Nested EXISTS queries on stores table may also hit RLS issues
    - Complex policy structure causes unexpected failures

  2. Solution
    - Since daily_reports.organization_id is set during insert
    - Directly check if user is a member of that organization with appropriate role
    - Also allow if user has store_assignment

  3. Security
    - Users must either have store_assignment OR be org owner/admin/manager
*/

DROP POLICY IF EXISTS "Users can insert reports" ON daily_reports;

CREATE POLICY "Users can insert reports"
  ON daily_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Option 1: User has store assignment for this store
    EXISTS (
      SELECT 1 FROM store_assignments sa
      WHERE sa.user_id = (SELECT auth.uid())
      AND sa.store_id = daily_reports.store_id
    )
    OR
    -- Option 2: User is owner/admin/manager of the organization in the report
    (
      daily_reports.organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.user_id = (SELECT auth.uid())
        AND om.organization_id = daily_reports.organization_id
        AND om.role IN ('owner', 'admin', 'manager')
      )
    )
  );
