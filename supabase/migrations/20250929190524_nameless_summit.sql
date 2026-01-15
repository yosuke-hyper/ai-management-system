/*
  # Create store vendor assignments table

  1. New Tables
    - `store_vendor_assignments`
      - `id` (uuid, primary key)
      - `store_id` (uuid, foreign key to stores)
      - `vendor_id` (uuid, foreign key to vendors)
      - `display_order` (integer, for sorting)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `store_vendor_assignments` table
    - Add policy for authenticated users to read assignments for their stores
    - Add policy for managers/admin to manage assignments
*/

CREATE TABLE IF NOT EXISTS store_vendor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_id, vendor_id)
);

ALTER TABLE store_vendor_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read assignments for accessible stores"
  ON store_vendor_assignments
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT store_assignments.store_id
      FROM store_assignments
      WHERE store_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage vendor assignments"
  ON store_vendor_assignments
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
CREATE INDEX IF NOT EXISTS store_vendor_assignments_store_id_idx ON store_vendor_assignments (store_id);
CREATE INDEX IF NOT EXISTS store_vendor_assignments_vendor_id_idx ON store_vendor_assignments (vendor_id);