/*
  # Add DELETE policy for AI Generated Reports

  ## Changes
  This migration adds a DELETE policy to the ai_generated_reports table.

  ## Security
  - Only admins can delete AI generated reports
  - This prevents accidental or unauthorized deletion of reports

  ## Policy Details
  - Policy Name: "Admins can delete AI reports"
  - Operation: DELETE
  - Role: authenticated
  - Condition: User must be an admin (verified via is_admin() function)
*/

-- Add DELETE policy for ai_generated_reports
CREATE POLICY "Admins can delete AI reports"
  ON ai_generated_reports FOR DELETE
  TO authenticated
  USING (public.is_admin());