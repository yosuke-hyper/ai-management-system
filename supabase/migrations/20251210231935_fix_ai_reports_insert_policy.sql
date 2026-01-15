/*
  # AI Generated Reports - INSERT Policy Fix

  1. Issue
    - ai_generated_reports table lacks INSERT policy
    - Reports cannot be saved due to RLS blocking inserts
  
  2. Changes
    - Add INSERT policy for authenticated users
    - Allow users to insert reports for their organization's stores
    - Service role can also insert reports (for edge functions)
  
  3. Security
    - Users can only insert reports for stores they have access to
    - Organization membership is verified
*/

-- Drop any existing insert policies first
DROP POLICY IF EXISTS "Service role can insert AI reports" ON ai_generated_reports;
DROP POLICY IF EXISTS "Authenticated users can insert reports" ON ai_generated_reports;

-- Allow service role to insert reports (used by edge functions)
CREATE POLICY "Service role can insert AI reports"
  ON ai_generated_reports
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow authenticated users to insert reports for their organization
CREATE POLICY "Authenticated users can insert reports"
  ON ai_generated_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.organization_id = ai_generated_reports.organization_id
    )
  );
