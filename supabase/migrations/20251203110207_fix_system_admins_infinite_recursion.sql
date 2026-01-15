/*
  # Fix system_admins RLS infinite recursion

  1. Changes
    - Drop the problematic recursive policy
    - Create a simple, non-recursive policy for system_admins table
    - Allow users to view their own system_admin record
    - Use a simpler approach without self-referencing queries

  2. Security
    - Users can only view their own system_admin record
    - No recursive policy checks
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Super admins can view all system admins" ON system_admins;

-- Drop other existing policies
DROP POLICY IF EXISTS "Super admins can view their own record" ON system_admins;
DROP POLICY IF EXISTS "No direct modification of system_admins" ON system_admins;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view their own system admin record"
  ON system_admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Prevent all modifications (only database functions should modify this table)
CREATE POLICY "Prevent direct inserts"
  ON system_admins
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Prevent direct updates"
  ON system_admins
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Prevent direct deletes"
  ON system_admins
  FOR DELETE
  TO authenticated
  USING (false);
