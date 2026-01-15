/*
  # Create Import History Table

  1. New Tables
    - `import_history`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `user_id` (uuid, foreign key to auth.users)
      - `store_id` (uuid, optional foreign key to stores)
      - `import_type` (text: 'daily_report' or 'monthly_expense')
      - `file_name` (text)
      - `file_size` (integer, bytes)
      - `total_rows` (integer)
      - `imported_count` (integer)
      - `failed_count` (integer)
      - `skipped_count` (integer)
      - `status` (text: 'success', 'partial', 'failed')
      - `error_details` (jsonb, array of error messages)
      - `date_range_start` (date, optional)
      - `date_range_end` (date, optional)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for organization members
*/

CREATE TABLE IF NOT EXISTS import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  store_id uuid REFERENCES stores(id) ON DELETE SET NULL,
  import_type text NOT NULL CHECK (import_type IN ('daily_report', 'monthly_expense')),
  file_name text NOT NULL,
  file_size integer,
  total_rows integer NOT NULL DEFAULT 0,
  imported_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('success', 'partial', 'failed')) DEFAULT 'success',
  error_details jsonb DEFAULT '[]'::jsonb,
  date_range_start date,
  date_range_end date,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization import history"
  ON import_history FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can insert import history for own organization"
  ON import_history FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_import_history_org_id ON import_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_import_history_created_at ON import_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_history_user_id ON import_history(user_id);