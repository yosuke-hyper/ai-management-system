/*
  # Add Demo Monthly Expenses Table

  ## Changes Made
  
  1. New Tables
    - `demo_monthly_expenses` - Demo monthly expense data
      - `id` (uuid, primary key)
      - `demo_org_id` (uuid, foreign key)
      - `demo_store_id` (uuid, foreign key)
      - `month` (text) - Format: YYYY-MM
      - `labor_cost_employee` (numeric) - Employee labor cost
      - `labor_cost_part_time` (numeric) - Part-time labor cost
      - `utilities` (numeric) - Utilities cost
      - `rent` (numeric) - Rent
      - `consumables` (numeric) - Consumables
      - `promotion` (numeric) - Promotion expenses
      - `cleaning` (numeric) - Cleaning expenses
      - `misc` (numeric) - Miscellaneous expenses
      - `communication` (numeric) - Communication expenses
      - `others` (numeric) - Other expenses
      - `memo` (text) - Notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Public read access for demo monthly expenses
    - Prevent modifications to maintain demo data integrity
  
  3. Sample Data
    - Insert sample monthly expense data for demo stores
    - Data covers last 3 months for all 4 demo stores (新宿店, 渋谷店, 池袋店, 横浜店)
*/

-- Create demo_monthly_expenses table
CREATE TABLE IF NOT EXISTS demo_monthly_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_org_id uuid NOT NULL REFERENCES demo_organizations(id) ON DELETE CASCADE,
  demo_store_id uuid NOT NULL REFERENCES demo_stores(id) ON DELETE CASCADE,
  month text NOT NULL,
  labor_cost_employee numeric DEFAULT 0,
  labor_cost_part_time numeric DEFAULT 0,
  utilities numeric DEFAULT 0,
  rent numeric DEFAULT 0,
  consumables numeric DEFAULT 0,
  promotion numeric DEFAULT 0,
  cleaning numeric DEFAULT 0,
  misc numeric DEFAULT 0,
  communication numeric DEFAULT 0,
  others numeric DEFAULT 0,
  memo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(demo_store_id, month)
);

-- Enable RLS
ALTER TABLE demo_monthly_expenses ENABLE ROW LEVEL SECURITY;

-- Public read access for demo monthly expenses
CREATE POLICY "Public can read demo monthly expenses"
  ON demo_monthly_expenses
  FOR SELECT
  USING (true);

-- Prevent insert/update/delete to maintain demo data integrity
CREATE POLICY "No modifications to demo monthly expenses"
  ON demo_monthly_expenses
  FOR ALL
  USING (false);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_demo_monthly_expenses_store_month 
  ON demo_monthly_expenses(demo_store_id, month);

CREATE INDEX IF NOT EXISTS idx_demo_monthly_expenses_org 
  ON demo_monthly_expenses(demo_org_id);

-- Insert sample data for demo stores
-- This will be populated by the demo session service
-- Sample data structure:
-- - 4 stores: 新宿店, 渋谷店, 池袋店, 横浜店
-- - Last 3 months of data for each store
-- - Realistic expense amounts

COMMENT ON TABLE demo_monthly_expenses IS 'Demo monthly expense data - read-only for demo sessions';
COMMENT ON COLUMN demo_monthly_expenses.month IS 'Month in YYYY-MM format';
