/*
  # Create daily_report_vendor_purchases table

  1. New Tables
    - `daily_report_vendor_purchases`
      - `id` (uuid, primary key)
      - `daily_report_id` (uuid, foreign key to daily_reports)
      - `vendor_id` (uuid, foreign key to vendors)
      - `amount` (integer, purchase amount from this vendor)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `daily_report_vendor_purchases` table
    - Add policy for users to read vendor purchases for their accessible stores
    - Add policy for users to insert/update vendor purchases for their accessible stores
  
  3. Notes
    - This table stores the breakdown of purchases by vendor for each daily report
    - The total of all vendor purchases should match the `purchase` field in daily_reports
*/

CREATE TABLE IF NOT EXISTS daily_report_vendor_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  amount integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(daily_report_id, vendor_id)
);

ALTER TABLE daily_report_vendor_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read vendor purchases for accessible stores"
  ON daily_report_vendor_purchases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_reports
      JOIN store_assignments ON daily_reports.store_id = store_assignments.store_id
      WHERE daily_reports.id = daily_report_vendor_purchases.daily_report_id
      AND store_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert vendor purchases for accessible stores"
  ON daily_report_vendor_purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM daily_reports
      JOIN store_assignments ON daily_reports.store_id = store_assignments.store_id
      WHERE daily_reports.id = daily_report_vendor_purchases.daily_report_id
      AND store_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update vendor purchases for accessible stores"
  ON daily_report_vendor_purchases
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_reports
      JOIN store_assignments ON daily_reports.store_id = store_assignments.store_id
      WHERE daily_reports.id = daily_report_vendor_purchases.daily_report_id
      AND store_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete vendor purchases for accessible stores"
  ON daily_report_vendor_purchases
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_reports
      JOIN store_assignments ON daily_reports.store_id = store_assignments.store_id
      WHERE daily_reports.id = daily_report_vendor_purchases.daily_report_id
      AND store_assignments.user_id = auth.uid()
    )
  );

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS daily_report_vendor_purchases_report_id_idx ON daily_report_vendor_purchases (daily_report_id);
CREATE INDEX IF NOT EXISTS daily_report_vendor_purchases_vendor_id_idx ON daily_report_vendor_purchases (vendor_id);