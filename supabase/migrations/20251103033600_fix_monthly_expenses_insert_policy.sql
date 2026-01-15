/*
  # Fix monthly_expenses RLS policies

  1. Changes
    - Remove old duplicate policies
    - Update INSERT policy to allow all authenticated users in organization
    - Keep proper organization isolation
  
  2. Security
    - Users can insert monthly expenses for their organization
    - Users can only view/update/delete expenses in their organization
    - Admin restriction removed from INSERT to allow normal users to create expenses
*/

-- Drop old conflicting policies
DROP POLICY IF EXISTS "Users can read monthly expenses for assigned stores" ON monthly_expenses;
DROP POLICY IF EXISTS "Users can manage monthly expenses for assigned stores" ON monthly_expenses;

-- Drop and recreate the restrictive INSERT policy
DROP POLICY IF EXISTS "me_insert" ON monthly_expenses;

CREATE POLICY "me_insert"
  ON monthly_expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());
