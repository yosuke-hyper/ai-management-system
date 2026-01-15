/*
  # Simplify daily_reports INSERT policy to basic org membership check

  1. Problem
    - Complex function-based policy still failing
    - Need to simplify to most basic check

  2. Solution
    - Allow INSERT if user is ANY member of the organization
    - Use inline subquery instead of function
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert reports" ON daily_reports;

-- Create simple INSERT policy - just check organization membership
CREATE POLICY "Users can insert reports"
ON daily_reports
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = daily_reports.organization_id
  )
);
