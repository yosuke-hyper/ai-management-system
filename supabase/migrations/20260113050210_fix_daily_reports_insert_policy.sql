/*
  # Fix Daily Reports Insert Policy

  ## Problem
  Current INSERT policy only checks organization membership.
  Users cannot insert reports for stores they are not assigned to.

  ## Solution
  Update INSERT policy to also check store_assignments.
  Users must be either:
  1. Assigned to the specific store (store_assignments)
  2. An admin/owner in the organization

  ## Security
  - Users can only insert reports for stores they are assigned to
  - Admins/owners can insert reports for any store in their organization
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can insert reports for assigned stores" ON daily_reports;

-- Create updated policy with store assignment check
CREATE POLICY "Users can insert reports for assigned stores"
  ON daily_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must be assigned to the store
    EXISTS (
      SELECT 1 FROM store_assignments sa
      WHERE sa.user_id = auth.uid()
      AND sa.store_id = daily_reports.store_id
    )
    OR
    -- OR user is admin/owner in the organization
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = daily_reports.organization_id
      AND om.role IN ('admin', 'owner')
    )
  );
