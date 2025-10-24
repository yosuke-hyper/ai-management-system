/*
  # Fix vendors INSERT policy to allow both admin and owner roles

  1. Changes
    - Drop existing vendors_insert_policy
    - Create new policy that allows both 'admin' and 'owner' roles
    - This ensures organization owners can also create vendors

  2. Security
    - Still requires user to be authenticated
    - Still requires user to be a member of the organization
    - Now allows both 'admin' and 'owner' roles (previously only 'admin')
*/

-- Drop existing policy
DROP POLICY IF EXISTS vendors_insert_policy ON vendors;

-- Create new policy that allows both admin and owner
CREATE POLICY "vendors_insert_policy"
  ON vendors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM organization_members
      WHERE organization_members.user_id = auth.uid()
        AND organization_members.organization_id = vendors.organization_id
        AND organization_members.role IN ('owner', 'admin')
    )
  );
