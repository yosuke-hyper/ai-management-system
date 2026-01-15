/*
  # Add UPDATE policies for AI Reports

  ## Changes
  1. Add UPDATE policy for admins to update all AI reports
  2. Add UPDATE policy for managers to update reports for their stores

  ## Security
  - Admins can update all reports
  - Managers can update reports for stores they manage
  - Staff cannot update reports (read-only access)
*/

-- Admins can update all AI reports
CREATE POLICY "Admins can update AI reports"
  ON ai_generated_reports FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Managers can update reports for their stores
CREATE POLICY "Managers can update reports for their stores"
  ON ai_generated_reports FOR UPDATE
  TO authenticated
  USING (
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
