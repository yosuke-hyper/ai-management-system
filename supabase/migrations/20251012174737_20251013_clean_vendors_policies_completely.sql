/*
  # Clean vendors table policies completely

  1. Changes
    - Drop ALL existing policies on vendors table (8 duplicate policies found)
    - Create clean, simple policies without infinite recursion
  
  2. Security
    - Users can view vendors in their organization
    - Admins can manage (insert/update/delete) vendors
*/

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Admins can delete vendors" ON vendors;
DROP POLICY IF EXISTS "Admins can insert vendors" ON vendors;
DROP POLICY IF EXISTS "Admins can update vendors" ON vendors;
DROP POLICY IF EXISTS "Users can view vendors in organization" ON vendors;
DROP POLICY IF EXISTS "vendors_delete" ON vendors;
DROP POLICY IF EXISTS "vendors_insert" ON vendors;
DROP POLICY IF EXISTS "vendors_select" ON vendors;
DROP POLICY IF EXISTS "vendors_update" ON vendors;

-- Create simple, non-recursive policies
CREATE POLICY "vendors_select_policy"
  ON vendors FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "vendors_insert_policy"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND organization_id = vendors.organization_id
      AND role = 'admin'
    )
  );

CREATE POLICY "vendors_update_policy"
  ON vendors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND organization_id = vendors.organization_id
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND organization_id = vendors.organization_id
      AND role = 'admin'
    )
  );

CREATE POLICY "vendors_delete_policy"
  ON vendors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND organization_id = vendors.organization_id
      AND role = 'admin'
    )
  );