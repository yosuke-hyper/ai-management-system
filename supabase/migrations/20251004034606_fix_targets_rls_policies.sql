/*
  # Fix targets table RLS policies

  1. Changes
    - Drop existing restrictive policies
    - Add separate policies for SELECT, INSERT, UPDATE, DELETE
    - Allow admins to manage all targets
    - Allow managers to manage targets for assigned stores only

  2. Security
    - Admins have full access to all targets
    - Managers can only manage targets for stores they are assigned to
    - Staff can only view targets for assigned stores
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read targets for assigned stores" ON targets;
DROP POLICY IF EXISTS "Managers can manage targets" ON targets;

-- SELECT: Users can read targets for stores they have access to
CREATE POLICY "Users can view targets for accessible stores"
  ON targets
  FOR SELECT
  TO authenticated
  USING (
    -- Admins can see all targets
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Others can see targets for assigned stores
    store_id IN (
      SELECT store_assignments.store_id
      FROM store_assignments
      WHERE store_assignments.user_id = auth.uid()
    )
  );

-- INSERT: Managers and admins can create targets
CREATE POLICY "Managers can create targets"
  ON targets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admins can create targets for any store
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Managers can create targets for assigned stores
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'manager'
      )
      AND store_id IN (
        SELECT store_assignments.store_id
        FROM store_assignments
        WHERE store_assignments.user_id = auth.uid()
      )
    )
  );

-- UPDATE: Managers and admins can update targets
CREATE POLICY "Managers can update targets"
  ON targets
  FOR UPDATE
  TO authenticated
  USING (
    -- Admins can update all targets
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Managers can update targets for assigned stores
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'manager'
      )
      AND store_id IN (
        SELECT store_assignments.store_id
        FROM store_assignments
        WHERE store_assignments.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    -- Admins can update to any store
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Managers can update to assigned stores
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'manager'
      )
      AND store_id IN (
        SELECT store_assignments.store_id
        FROM store_assignments
        WHERE store_assignments.user_id = auth.uid()
      )
    )
  );

-- DELETE: Managers and admins can delete targets
CREATE POLICY "Managers can delete targets"
  ON targets
  FOR DELETE
  TO authenticated
  USING (
    -- Admins can delete all targets
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Managers can delete targets for assigned stores
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'manager'
      )
      AND store_id IN (
        SELECT store_assignments.store_id
        FROM store_assignments
        WHERE store_assignments.user_id = auth.uid()
      )
    )
  );
