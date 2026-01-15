/*
  # AI Generated Reports Delete Policy

  1. Changes
    - Add DELETE policy for ai_generated_reports table
    - Allow admins and managers to delete reports in their organization
  
  2. Security
    - Only authenticated users can delete
    - Users must be admin or manager in the organization
    - Can only delete reports from their own organization
*/

-- Add DELETE policy for ai_generated_reports
CREATE POLICY "Users can delete own organization reports"
  ON ai_generated_reports
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = ai_generated_reports.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'manager')
    )
  );
