/*
  # Create base schema for restaurant reporting system

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `name` (text, user name)
      - `email` (text, user email)
      - `role` (text, user role: staff/manager/admin)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `stores`
      - `id` (uuid, primary key)
      - `name` (text, store name)
      - `address` (text, store address)
      - `manager_id` (uuid, optional, foreign key to profiles)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `store_assignments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `store_id` (uuid, foreign key to stores)
      - `created_at` (timestamp)
    
    - `daily_reports`
      - `id` (uuid, primary key)
      - `date` (date, report date)
      - `store_id` (uuid, foreign key to stores)
      - `user_id` (uuid, foreign key to profiles)
      - `sales` (integer, daily sales)
      - `purchase` (integer, purchase costs)
      - `labor_cost` (integer, labor costs)
      - `utilities` (integer, utility costs)
      - `promotion` (integer, promotion costs)
      - `cleaning` (integer, cleaning costs)
      - `misc` (integer, miscellaneous costs)
      - `communication` (integer, communication costs)
      - `others` (integer, other costs)
      - `customers` (integer, number of customers)
      - `report_text` (text, optional report notes)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `summary_data`
      - `id` (uuid, primary key)
      - `period_type` (text, 'daily', 'weekly', 'monthly')
      - `period_start` (date)
      - `period_end` (date)
      - `store_id` (uuid, optional, null for all stores)
      - `total_sales` (integer)
      - `total_expenses` (integer)
      - `gross_profit` (integer)
      - `operating_profit` (integer)
      - `profit_margin` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Staff can view/create reports for assigned stores
    - Managers can view/manage reports for assigned stores
    - Admins can view/manage all data
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('staff', 'manager', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Stores table
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  manager_id uuid REFERENCES profiles(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read active stores"
  ON stores FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage stores"
  ON stores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Store assignments table
CREATE TABLE IF NOT EXISTS store_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, store_id)
);

ALTER TABLE store_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own store assignments"
  ON store_assignments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage store assignments"
  ON store_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Daily reports table
CREATE TABLE IF NOT EXISTS daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sales integer DEFAULT 0,
  purchase integer DEFAULT 0,
  labor_cost integer DEFAULT 0,
  utilities integer DEFAULT 0,
  promotion integer DEFAULT 0,
  cleaning integer DEFAULT 0,
  misc integer DEFAULT 0,
  communication integer DEFAULT 0,
  others integer DEFAULT 0,
  customers integer DEFAULT 0,
  report_text text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(date, store_id)
);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read reports for assigned stores"
  ON daily_reports FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT store_assignments.store_id
      FROM store_assignments
      WHERE store_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert reports for assigned stores"
  ON daily_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND store_id IN (
      SELECT store_assignments.store_id
      FROM store_assignments
      WHERE store_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own reports for assigned stores"
  ON daily_reports FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND store_id IN (
      SELECT store_assignments.store_id
      FROM store_assignments
      WHERE store_assignments.user_id = auth.uid()
    )
  );

-- Summary data table
CREATE TABLE IF NOT EXISTS summary_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type text NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  total_sales integer DEFAULT 0,
  total_expenses integer DEFAULT 0,
  gross_profit integer DEFAULT 0,
  operating_profit integer DEFAULT 0,
  profit_margin numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE summary_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read summary data for assigned stores"
  ON summary_data FOR SELECT
  TO authenticated
  USING (
    store_id IS NULL
    OR store_id IN (
      SELECT store_assignments.store_id
      FROM store_assignments
      WHERE store_assignments.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles (email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles (role);
CREATE INDEX IF NOT EXISTS stores_active_idx ON stores (is_active);
CREATE INDEX IF NOT EXISTS store_assignments_user_idx ON store_assignments (user_id);
CREATE INDEX IF NOT EXISTS store_assignments_store_idx ON store_assignments (store_id);
CREATE INDEX IF NOT EXISTS daily_reports_date_idx ON daily_reports (date);
CREATE INDEX IF NOT EXISTS daily_reports_store_idx ON daily_reports (store_id);
CREATE INDEX IF NOT EXISTS daily_reports_user_idx ON daily_reports (user_id);
CREATE INDEX IF NOT EXISTS summary_data_period_idx ON summary_data (period_type, period_start, period_end);
CREATE INDEX IF NOT EXISTS summary_data_store_idx ON summary_data (store_id);
