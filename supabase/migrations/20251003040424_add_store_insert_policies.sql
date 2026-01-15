/*
  # Add INSERT/UPDATE/DELETE policies for stores table

  1. Changes
    - Add INSERT policy for managers/admin to create stores
    - Add UPDATE policy for managers/admin to update stores
    - Add DELETE policy for managers/admin to delete stores (soft delete)

  2. Security
    - Only managers and admins can create/update/delete stores
    - Staff can only read stores they are assigned to
*/

-- INSERT policy for managers/admin
CREATE POLICY "Managers can create stores"
  ON stores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- UPDATE policy for managers/admin
CREATE POLICY "Managers can update stores"
  ON stores
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- DELETE policy for managers/admin (though we use soft delete with is_active)
CREATE POLICY "Managers can delete stores"
  ON stores
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );
