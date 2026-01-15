/*
  # Fix daily_reports INSERT policy using SECURITY DEFINER function

  1. Problem
    - The INSERT policy subquery joins stores table
    - But stores table has RLS that blocks access in the subquery context
    - This causes "new row violates row-level security policy" error

  2. Solution
    - Create a SECURITY DEFINER helper function that bypasses RLS
    - This function checks if user can insert report for a given store
    - Update the INSERT policy to use this function

  3. Security
    - Function only returns boolean, doesn't expose data
    - Checks are still performed (store assignment OR org admin role)
*/

CREATE OR REPLACE FUNCTION can_insert_daily_report(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM store_assignments sa
    WHERE sa.user_id = auth.uid()
    AND sa.store_id = p_store_id
  )
  OR EXISTS (
    SELECT 1 FROM organization_members om
    JOIN stores s ON s.organization_id = om.organization_id
    WHERE om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin', 'manager')
    AND s.id = p_store_id
  );
$$;

DROP POLICY IF EXISTS "Users can insert reports" ON daily_reports;

CREATE POLICY "Users can insert reports"
  ON daily_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (can_insert_daily_report(store_id));
