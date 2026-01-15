/*
  # Temporary: Allow all authenticated users to INSERT daily_reports
  
  This is for debugging - will be tightened after confirming INSERT works
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert reports" ON daily_reports;

-- Create very permissive INSERT policy for testing
CREATE POLICY "Users can insert reports"
ON daily_reports
FOR INSERT
TO authenticated
WITH CHECK (true);
