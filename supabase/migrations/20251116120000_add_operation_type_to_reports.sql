/*
  # Add operation type support for lunch/dinner split

  1. Changes to Tables
    - Add `operation_type` column to `daily_reports` table
      - Type: text with check constraint ('lunch', 'dinner', 'full_day')
      - Default: 'full_day' for backward compatibility
    - Add `operation_type` column to `fixed_demo_reports` table
      - Same structure as above
    - Update UNIQUE constraint from (date, store_id) to (date, store_id, operation_type)
    - Add operation hours settings to `stores` table
      - `lunch_start_time` (time)
      - `lunch_end_time` (time)
      - `dinner_start_time` (time)
      - `dinner_end_time` (time)
    - Add operation hours to `fixed_demo_stores` table

  2. Data Migration
    - Set all existing daily_reports to operation_type = 'dinner'
    - Set all existing fixed_demo_reports to operation_type = 'dinner'
    - Add default operation hours to all stores

  3. Indexes
    - Add index on operation_type for better query performance
    - Update existing indexes to include operation_type

  4. Notes
    - This migration maintains backward compatibility
    - Existing data is preserved and marked as 'dinner' operation
    - New reports can be created with 'lunch', 'dinner', or 'full_day' types
*/

-- Add operation_type column to daily_reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_reports' AND column_name = 'operation_type'
  ) THEN
    ALTER TABLE daily_reports
    ADD COLUMN operation_type text DEFAULT 'full_day'
    CHECK (operation_type IN ('lunch', 'dinner', 'full_day'));
  END IF;
END $$;

-- Update existing data to 'dinner' type as requested
UPDATE daily_reports
SET operation_type = 'dinner'
WHERE operation_type = 'full_day';

-- Drop old unique constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_reports_date_store_id_key'
  ) THEN
    ALTER TABLE daily_reports DROP CONSTRAINT daily_reports_date_store_id_key;
  END IF;
END $$;

-- Add new unique constraint with operation_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_reports_date_store_operation_key'
  ) THEN
    ALTER TABLE daily_reports
    ADD CONSTRAINT daily_reports_date_store_operation_key
    UNIQUE (date, store_id, operation_type);
  END IF;
END $$;

-- Add operation hours to stores table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'lunch_start_time'
  ) THEN
    ALTER TABLE stores
    ADD COLUMN lunch_start_time time DEFAULT '11:00:00',
    ADD COLUMN lunch_end_time time DEFAULT '15:00:00',
    ADD COLUMN dinner_start_time time DEFAULT '17:00:00',
    ADD COLUMN dinner_end_time time DEFAULT '22:00:00';
  END IF;
END $$;

-- Add operation_type to fixed_demo_reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixed_demo_reports' AND column_name = 'operation_type'
  ) THEN
    ALTER TABLE fixed_demo_reports
    ADD COLUMN operation_type text DEFAULT 'full_day'
    CHECK (operation_type IN ('lunch', 'dinner', 'full_day'));
  END IF;
END $$;

-- Update existing demo data to 'dinner' type
UPDATE fixed_demo_reports
SET operation_type = 'dinner'
WHERE operation_type = 'full_day';

-- Drop old unique constraint for demo reports
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fixed_demo_reports_date_store_id_key'
  ) THEN
    ALTER TABLE fixed_demo_reports DROP CONSTRAINT fixed_demo_reports_date_store_id_key;
  END IF;
END $$;

-- Add new unique constraint for demo reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fixed_demo_reports_date_store_operation_key'
  ) THEN
    ALTER TABLE fixed_demo_reports
    ADD CONSTRAINT fixed_demo_reports_date_store_operation_key
    UNIQUE (date, store_id, operation_type);
  END IF;
END $$;

-- Add operation hours to fixed_demo_stores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixed_demo_stores' AND column_name = 'lunch_start_time'
  ) THEN
    ALTER TABLE fixed_demo_stores
    ADD COLUMN lunch_start_time time DEFAULT '11:00:00',
    ADD COLUMN lunch_end_time time DEFAULT '15:00:00',
    ADD COLUMN dinner_start_time time DEFAULT '17:00:00',
    ADD COLUMN dinner_end_time time DEFAULT '22:00:00';
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS daily_reports_operation_type_idx ON daily_reports (operation_type);
CREATE INDEX IF NOT EXISTS daily_reports_date_store_operation_idx ON daily_reports (date, store_id, operation_type);
CREATE INDEX IF NOT EXISTS fixed_demo_reports_operation_type_idx ON fixed_demo_reports (operation_type);
CREATE INDEX IF NOT EXISTS fixed_demo_reports_date_store_operation_idx ON fixed_demo_reports (date, store_id, operation_type);

-- Add comment to describe the operation_type column
COMMENT ON COLUMN daily_reports.operation_type IS 'Operation period: lunch (ランチ営業), dinner (ディナー営業), or full_day (終日営業)';
COMMENT ON COLUMN fixed_demo_reports.operation_type IS 'Operation period: lunch (ランチ営業), dinner (ディナー営業), or full_day (終日営業)';
