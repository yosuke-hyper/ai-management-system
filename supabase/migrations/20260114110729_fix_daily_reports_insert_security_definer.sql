/*
  # Fix daily_reports INSERT with SECURITY DEFINER function

  1. Problem
    - RLS on organization_members may block subquery in INSERT policy
    - Need to use SECURITY DEFINER to bypass RLS for the check

  2. Solution
    - Create SECURITY DEFINER function to check org membership
    - Use this function in INSERT policy
*/

-- Create a simple org membership check function
CREATE OR REPLACE FUNCTION check_org_membership(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE user_id = auth.uid()
    AND organization_id = p_org_id
  );
$$;

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert reports" ON daily_reports;

-- Create INSERT policy using SECURITY DEFINER function
CREATE POLICY "Users can insert reports"
ON daily_reports
FOR INSERT
TO authenticated
WITH CHECK (
  check_org_membership(organization_id)
);
