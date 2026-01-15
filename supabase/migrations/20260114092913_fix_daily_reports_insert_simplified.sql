/*
  # Simplify daily_reports INSERT policy

  1. Problem
    - Current INSERT policy has complex nested queries that may be affected by RLS
    - The store_assignments check may also be affected by RLS

  2. Solution
    - Create a new SECURITY DEFINER function that checks both conditions
    - Use this function in the INSERT policy

  3. Changes
    - Create can_insert_daily_report() function
    - Update INSERT policy to use this function
*/

-- Create a helper function that checks if user can insert daily report
CREATE OR REPLACE FUNCTION can_insert_daily_report(p_store_id uuid, p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid;
  has_store_assignment boolean;
  has_org_permission boolean;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check 1: User has store assignment
  SELECT EXISTS (
    SELECT 1 FROM store_assignments
    WHERE user_id = current_user_id
    AND store_id = p_store_id
  ) INTO has_store_assignment;

  IF has_store_assignment THEN
    RETURN true;
  END IF;

  -- Check 2: User is owner/admin/manager of the organization
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = current_user_id
    AND organization_id = p_org_id
    AND role IN ('owner', 'admin', 'manager')
  ) INTO has_org_permission;

  RETURN COALESCE(has_org_permission, false);
END;
$$;

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert reports" ON daily_reports;

-- Create new INSERT policy using the helper function
CREATE POLICY "Users can insert reports"
ON daily_reports
FOR INSERT
TO authenticated
WITH CHECK (
  can_insert_daily_report(store_id, organization_id)
);
