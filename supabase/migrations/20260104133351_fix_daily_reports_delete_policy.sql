/*
  # Fix Daily Reports Delete Policy

  ## Problem
  Current DELETE policy only allows owner/admin to delete reports.
  Users cannot delete their own reports.

  ## Solution
  Add policy to allow users to delete their own reports.

  ## Changes
  - Add "Users can delete own reports" policy for DELETE operation
  - Maintain existing admin delete policy

  ## Security
  - Users can only delete reports they created (user_id = auth.uid())
  - Admins/owners can delete any reports in their organization
*/

-- Add policy for users to delete their own reports
CREATE POLICY "Users can delete own reports"
  ON daily_reports FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Note: Existing "dr_delete" policy for admins remains active