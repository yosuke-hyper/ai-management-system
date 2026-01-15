/*
  # Daily Goal Achievements System
  
  1. New Tables
    - `daily_goal_achievements`
      - `id` (uuid, primary key)
      - `store_id` (uuid, foreign key to stores)
      - `organization_id` (uuid, foreign key to organizations)
      - `date` (date) - The date for this achievement record
      - `target_sales` (numeric) - Auto-calculated daily sales target
      - `actual_sales` (numeric) - Actual sales for the day
      - `sales_achieved` (boolean) - Whether sales target was met
      - `target_cost_rate` (numeric) - Target cost rate percentage
      - `actual_cost_rate` (numeric) - Actual cost rate percentage
      - `cost_rate_achieved` (boolean) - Whether cost rate target was met
      - `target_labor_rate` (numeric) - Target labor rate percentage
      - `actual_labor_rate` (numeric) - Actual labor rate percentage
      - `labor_rate_achieved` (boolean) - Whether labor rate target was met
      - `all_goals_achieved` (boolean) - Whether all goals were achieved
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `daily_goal_achievements` table
    - Add policies for authenticated users to manage their organization's data
  
  3. Indexes
    - Index on (store_id, date) for efficient lookups
    - Index on (organization_id, date) for organization-wide queries
*/

CREATE TABLE IF NOT EXISTS daily_goal_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date date NOT NULL,
  target_sales numeric DEFAULT 0,
  actual_sales numeric DEFAULT 0,
  sales_achieved boolean DEFAULT false,
  target_cost_rate numeric DEFAULT 0,
  actual_cost_rate numeric DEFAULT 0,
  cost_rate_achieved boolean DEFAULT false,
  target_labor_rate numeric DEFAULT 0,
  actual_labor_rate numeric DEFAULT 0,
  labor_rate_achieved boolean DEFAULT false,
  all_goals_achieved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_goal_achievements_store_date 
  ON daily_goal_achievements(store_id, date);

CREATE INDEX IF NOT EXISTS idx_daily_goal_achievements_org_date 
  ON daily_goal_achievements(organization_id, date);

ALTER TABLE daily_goal_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's daily goal achievements"
  ON daily_goal_achievements FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert daily goal achievements for their organization"
  ON daily_goal_achievements FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization's daily goal achievements"
  ON daily_goal_achievements FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their organization's daily goal achievements"
  ON daily_goal_achievements FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION update_daily_goal_achievements_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_daily_goal_achievements_timestamp ON daily_goal_achievements;

CREATE TRIGGER trigger_update_daily_goal_achievements_timestamp
  BEFORE UPDATE ON daily_goal_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_goal_achievements_timestamp();
