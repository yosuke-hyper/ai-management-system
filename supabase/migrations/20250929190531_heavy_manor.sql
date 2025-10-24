/*
  # Create monthly expenses table

  1. New Tables
    - `monthly_expenses`
      - `id` (uuid, primary key)
      - `store_id` (uuid, foreign key to stores)
      - `user_id` (uuid, foreign key to profiles)
      - `month` (text, format YYYY-MM)
      - `labor_cost_employee` (integer, employee labor cost)
      - `labor_cost_part_time` (integer, part-time labor cost)
      - `utilities` (integer, utility costs)
      - `promotion` (integer, promotion costs)
      - `cleaning` (integer, cleaning costs)
      - `misc` (integer, miscellaneous costs)
      - `communication` (integer, communication costs)
      - `others` (integer, other costs)
      - `memo` (text, optional memo)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `monthly_expenses` table
    - Add policy for users to manage expenses for assigned stores
*/

CREATE TABLE IF NOT EXISTS monthly_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month text NOT NULL, -- Format: YYYY-MM
  labor_cost_employee integer DEFAULT 0,
  labor_cost_part_time integer DEFAULT 0,
  utilities integer DEFAULT 0,
  promotion integer DEFAULT 0,
  cleaning integer DEFAULT 0,
  misc integer DEFAULT 0,
  communication integer DEFAULT 0,
  others integer DEFAULT 0,
  memo text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id, month)
);

ALTER TABLE monthly_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read monthly expenses for assigned stores"
  ON monthly_expenses
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT store_assignments.store_id
      FROM store_assignments
      WHERE store_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage monthly expenses for assigned stores"
  ON monthly_expenses
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    AND store_id IN (
      SELECT store_assignments.store_id
      FROM store_assignments
      WHERE store_assignments.user_id = auth.uid()
    )
  );

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS monthly_expenses_store_month_idx ON monthly_expenses (store_id, month);
CREATE INDEX IF NOT EXISTS monthly_expenses_user_id_idx ON monthly_expenses (user_id);