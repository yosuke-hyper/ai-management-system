/*
  # Fix AI Reports Policy Conflicts

  ## Changes
  1. Drop existing UPDATE policies to avoid conflicts
  2. Recreate simplified UPDATE policies
  3. Ensure proper policy evaluation order

  ## Security
  - Maintains same security levels
  - Admins and managers can update reports
  - No change to SELECT, INSERT, DELETE policies
*/

-- Drop existing UPDATE policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Admins can update AI reports" ON ai_generated_reports;
  DROP POLICY IF EXISTS "Managers can update reports for their stores" ON ai_generated_reports;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create single UPDATE policy for admins and managers
CREATE POLICY "Authenticated users can update their accessible reports"
  ON ai_generated_reports FOR UPDATE
  TO authenticated
  USING (
    -- Admins can update all reports
    public.is_admin()
    OR
    -- Managers can update reports for their stores
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
      AND (
        ai_generated_reports.store_id IS NULL
        OR ai_generated_reports.store_id IN (
          SELECT id FROM stores WHERE manager_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    -- Admins can update all reports
    public.is_admin()
    OR
    -- Managers can update reports for their stores
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
      AND (
        ai_generated_reports.store_id IS NULL
        OR ai_generated_reports.store_id IN (
          SELECT id FROM stores WHERE manager_id = auth.uid()
        )
      )
    )
  );
