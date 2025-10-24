/*
  # Add Cost Rate Targets to Targets Table

  1. Changes
    - Add `target_cost_rate` column to `targets` table (目標原価率)
    - Add `target_labor_rate` column to `targets` table (目標人件費率)
    - Both columns are optional decimals with default value of 0
    - Values are stored as percentages (e.g., 30.5 for 30.5%)

  2. Notes
    - Existing records will have default values of 0
    - These targets will be used in KPI analysis and dashboard displays
    - No RLS policy changes needed as policies are already in place
*/

-- Add target cost rate column (目標原価率)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'targets' AND column_name = 'target_cost_rate'
  ) THEN
    ALTER TABLE targets ADD COLUMN target_cost_rate decimal DEFAULT 0;
  END IF;
END $$;

-- Add target labor rate column (目標人件費率)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'targets' AND column_name = 'target_labor_rate'
  ) THEN
    ALTER TABLE targets ADD COLUMN target_labor_rate decimal DEFAULT 0;
  END IF;
END $$;

-- Add comments for clarity
COMMENT ON COLUMN targets.target_cost_rate IS 'Target cost of goods sold rate as percentage (e.g., 30.5 for 30.5%)';
COMMENT ON COLUMN targets.target_labor_rate IS 'Target labor cost rate as percentage (e.g., 25.0 for 25.0%)';