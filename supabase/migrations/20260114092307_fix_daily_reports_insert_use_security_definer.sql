/*
  # Fix daily_reports INSERT policy to use SECURITY DEFINER function

  1. Problem
    - Current INSERT policy queries organization_members directly
    - This is affected by RLS on organization_members table
    - Even though the user is an owner, the subquery may not see the data

  2. Solution
    - Use the existing is_org_owner_admin_manager() SECURITY DEFINER function
    - This function bypasses RLS and can check organization membership properly

  3. Changes
    - Drop existing INSERT policy
    - Create new INSERT policy using helper function
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert reports" ON daily_reports;

-- Create new INSERT policy using SECURITY DEFINER function
CREATE POLICY "Users can insert reports"
ON daily_reports
FOR INSERT
TO authenticated
WITH CHECK (
  -- Option 1: User has store assignment for this store
  EXISTS (
    SELECT 1 FROM store_assignments sa
    WHERE sa.user_id = auth.uid()
    AND sa.store_id = daily_reports.store_id
  )
  OR
  -- Option 2: User is owner/admin/manager of the organization
  (
    organization_id IS NOT NULL 
    AND is_org_owner_admin_manager(organization_id)
  )
);
