/*
  # Restore proper daily_reports INSERT policy

  Now that the broken trigger is fixed, restore secure INSERT policy
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert reports" ON daily_reports;

-- Create proper INSERT policy using SECURITY DEFINER function
CREATE POLICY "Users can insert reports"
ON daily_reports
FOR INSERT
TO authenticated
WITH CHECK (
  check_org_membership(organization_id)
);
