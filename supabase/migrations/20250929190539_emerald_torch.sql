/*
  # Create targets table

  1. New Tables
    - `targets`
      - `id` (uuid, primary key)
      - `store_id` (uuid, foreign key to stores)
      - `period` (text, format YYYY-MM)
      - `target_sales` (integer, target sales amount)
      - `target_profit` (integer, target profit amount)
      - `target_profit_margin` (numeric, target profit margin percentage)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `targets` table
    - Add policy for users to read targets for assigned stores
    - Add policy for managers/admin to manage targets
*/

CREATE TABLE IF NOT EXISTS targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  period text NOT NULL, -- Format: YYYY-MM
  target_sales integer DEFAULT 0,
  target_profit integer DEFAULT 0,
  target_profit_margin numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id, period)
);

ALTER TABLE targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read targets for assigned stores"
  ON targets
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT store_assignments.store_id
      FROM store_assignments
      WHERE store_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage targets"
  ON targets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
    AND store_id IN (
      SELECT store_assignments.store_id
      FROM store_assignments
      WHERE store_assignments.user_id = auth.uid()
    )
  );

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS targets_store_period_idx ON targets (store_id, period);
CREATE INDEX IF NOT EXISTS targets_period_idx ON targets (period);