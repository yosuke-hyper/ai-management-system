/*
  # Fix daily_reports INSERT policy to allow organization owners/admins

  1. Problem
    - Current INSERT policy only checks store_assignments
    - Organization owners and admins cannot insert reports for their stores
    - Error: "new row violates row-level security policy for table daily_reports"

  2. Solution
    - Update INSERT policy to also allow organization owners/admins/managers
    - They should be able to insert reports for any store in their organization

  3. Security
    - Users with store assignment can insert for their assigned stores
    - Organization owners/admins/managers can insert for any store in their org
*/

DROP POLICY IF EXISTS "Users can insert reports" ON daily_reports;

CREATE POLICY "Users can insert reports"
  ON daily_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM store_assignments sa
      WHERE sa.user_id = (SELECT auth.uid())
      AND sa.store_id = daily_reports.store_id
    )
    OR
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN stores s ON s.organization_id = om.organization_id
      WHERE om.user_id = (SELECT auth.uid())
      AND om.role IN ('owner', 'admin', 'manager')
      AND s.id = daily_reports.store_id
    )
  );
