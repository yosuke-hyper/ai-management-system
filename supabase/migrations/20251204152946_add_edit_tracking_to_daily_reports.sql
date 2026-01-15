/*
  # Add Edit Tracking to Daily Reports

  1. Changes
    - Add `last_edited_by` column to track who made the last edit
    - Add `last_edited_at` column to track when the last edit was made
    - Add `edit_count` column to track the number of times a report has been edited
    - Create trigger to automatically update edit tracking fields on UPDATE
    - Create helper function to record edit history in audit logs

  2. Purpose
    - Enable full audit trail for daily report modifications
    - Track editing activity for compliance and accountability
    - Support UI features like "last edited by" indicators
    - Integrate with existing audit_logs system

  3. Security
    - No RLS changes needed (uses existing daily_reports policies)
    - Audit logging function uses security definer for proper permissions
*/

-- Add edit tracking columns to daily_reports
ALTER TABLE daily_reports
ADD COLUMN IF NOT EXISTS last_edited_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS last_edited_at timestamptz,
ADD COLUMN IF NOT EXISTS edit_count integer DEFAULT 0;

-- Add edit tracking columns to fixed_demo_reports (for demo mode)
ALTER TABLE fixed_demo_reports
ADD COLUMN IF NOT EXISTS last_edited_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS last_edited_at timestamptz,
ADD COLUMN IF NOT EXISTS edit_count integer DEFAULT 0;

-- Create function to update edit tracking fields
CREATE OR REPLACE FUNCTION update_daily_report_edit_tracking()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update edit tracking fields
  NEW.last_edited_by := auth.uid();
  NEW.last_edited_at := now();
  NEW.edit_count := COALESCE(OLD.edit_count, 0) + 1;
  NEW.updated_at := now();
  
  -- Log the edit to audit_logs if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    INSERT INTO audit_logs (
      user_id,
      organization_id,
      action,
      resource_type,
      resource_id,
      details,
      ip_address
    )
    VALUES (
      auth.uid(),
      (SELECT organization_id FROM stores WHERE id = NEW.store_id),
      'update',
      'daily_report',
      NEW.id,
      jsonb_build_object(
        'date', NEW.date,
        'store_id', NEW.store_id,
        'edit_count', NEW.edit_count,
        'changes', jsonb_build_object(
          'sales', CASE WHEN OLD.sales != NEW.sales THEN jsonb_build_object('old', OLD.sales, 'new', NEW.sales) ELSE null END,
          'purchase', CASE WHEN OLD.purchase != NEW.purchase THEN jsonb_build_object('old', OLD.purchase, 'new', NEW.purchase) ELSE null END,
          'labor_cost', CASE WHEN OLD.labor_cost != NEW.labor_cost THEN jsonb_build_object('old', OLD.labor_cost, 'new', NEW.labor_cost) ELSE null END,
          'customers', CASE WHEN OLD.customers != NEW.customers THEN jsonb_build_object('old', OLD.customers, 'new', NEW.customers) ELSE null END
        )
      ),
      inet_client_addr()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for daily_reports
DROP TRIGGER IF EXISTS daily_reports_edit_tracking_trigger ON daily_reports;
CREATE TRIGGER daily_reports_edit_tracking_trigger
  BEFORE UPDATE ON daily_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_report_edit_tracking();

-- Create similar trigger for fixed_demo_reports (without audit logging)
CREATE OR REPLACE FUNCTION update_demo_report_edit_tracking()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_edited_by := auth.uid();
  NEW.last_edited_at := now();
  NEW.edit_count := COALESCE(OLD.edit_count, 0) + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS demo_reports_edit_tracking_trigger ON fixed_demo_reports;
CREATE TRIGGER demo_reports_edit_tracking_trigger
  BEFORE UPDATE ON fixed_demo_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_demo_report_edit_tracking();

-- Create index for performance
CREATE INDEX IF NOT EXISTS daily_reports_last_edited_by_idx ON daily_reports(last_edited_by);
CREATE INDEX IF NOT EXISTS daily_reports_last_edited_at_idx ON daily_reports(last_edited_at);