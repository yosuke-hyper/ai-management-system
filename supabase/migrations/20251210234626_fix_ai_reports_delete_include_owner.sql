/*
  # Fix AI Reports Delete Policy to Include Owner

  1. Changes
    - Update DELETE policy for ai_generated_reports to include 'owner' role
    - Owner should have full access to delete reports in their organization

  2. Security
    - Maintains organization-level isolation
    - Allows owner, admin, and manager roles to delete reports
*/

-- Drop existing delete policy
DROP POLICY IF EXISTS "Users can delete own organization reports" ON ai_generated_reports;

-- Create new delete policy that includes owner
CREATE POLICY "Users can delete own organization reports"
  ON ai_generated_reports
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM organization_members
      WHERE organization_members.organization_id = ai_generated_reports.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin', 'manager')
    )
  );