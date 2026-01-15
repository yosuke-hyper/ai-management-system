/*
  # Fix vendors table RLS policies - Final Fix

  1. Changes
    - Drop all existing policies on vendors table
    - Create new simplified policies that avoid infinite recursion
    - Use direct auth.uid() checks without complex subqueries
  
  2. Security
    - Users can only see vendors in their organization
    - Admin users can manage vendors
*/

-- Drop all existing policies on vendors table
DROP POLICY IF EXISTS "Users can view vendors in their organization" ON vendors;
DROP POLICY IF EXISTS "Users can view own organization vendors" ON vendors;
DROP POLICY IF EXISTS "Admin users can insert vendors" ON vendors;
DROP POLICY IF EXISTS "Admin users can update vendors" ON vendors;
DROP POLICY IF EXISTS "Admin users can delete vendors" ON vendors;

-- Create new simplified policies
CREATE POLICY "Users can view vendors in organization"
  ON vendors FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert vendors"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update vendors"
  ON vendors FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete vendors"
  ON vendors FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );