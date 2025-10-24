/*
  # Fix all vendors policies to allow both admin and owner roles

  1. Changes
    - Drop existing vendors_update_policy and vendors_delete_policy
    - Create new policies that allow both 'admin' and 'owner' roles
    - This ensures organization owners can manage vendors

  2. Security
    - Still requires user to be authenticated
    - Still requires user to be a member of the organization
    - Now allows both 'admin' and 'owner' roles (previously only 'admin')
*/

-- Drop existing policies
DROP POLICY IF EXISTS vendors_update_policy ON vendors;
DROP POLICY IF EXISTS vendors_delete_policy ON vendors;

-- Create new UPDATE policy that allows both admin and owner
CREATE POLICY "vendors_update_policy"
  ON vendors
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM organization_members
      WHERE organization_members.user_id = auth.uid()
        AND organization_members.organization_id = vendors.organization_id
        AND organization_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM organization_members
      WHERE organization_members.user_id = auth.uid()
        AND organization_members.organization_id = vendors.organization_id
        AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Create new DELETE policy that allows both admin and owner
CREATE POLICY "vendors_delete_policy"
  ON vendors
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM organization_members
      WHERE organization_members.user_id = auth.uid()
        AND organization_members.organization_id = vendors.organization_id
        AND organization_members.role IN ('owner', 'admin')
    )
  );
