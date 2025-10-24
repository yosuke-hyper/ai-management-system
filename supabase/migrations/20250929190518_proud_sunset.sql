/*
  # Create vendors table

  1. New Tables
    - `vendors`
      - `id` (uuid, primary key)
      - `name` (text, vendor name)
      - `category` (text, vendor category)
      - `contact_info` (text, optional contact information)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `vendors` table
    - Add policy for authenticated users to read vendor data
    - Add policy for managers/admin to manage vendors
*/

CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY[
    'vegetable_meat',
    'seafood', 
    'alcohol',
    'rice',
    'seasoning',
    'frozen',
    'dessert',
    'others'
  ])),
  contact_info text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read vendors"
  ON vendors
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage vendors"
  ON vendors
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- Index for better performance
CREATE INDEX IF NOT EXISTS vendors_category_idx ON vendors (category);
CREATE INDEX IF NOT EXISTS vendors_active_idx ON vendors (is_active);