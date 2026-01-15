/*
  # Fix constraints and re-split demo data into lunch/dinner

  1. Constraint Changes
    - Drop old unique constraint (store_id, date)
    - Keep new unique constraint (date, store_id, operation_type)

  2. Schema Changes
    - Add missing columns: customers, lunch_customers, dinner_customers, report_text

  3. Data Split
    - Delete existing lunch/dinner split data
    - Recreate split with variable ratios per store
*/

-- Drop old unique constraint that prevents lunch/dinner split
ALTER TABLE fixed_demo_reports DROP CONSTRAINT IF EXISTS fixed_demo_reports_store_id_date_key;

-- Add missing columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixed_demo_reports' AND column_name = 'customers'
  ) THEN
    ALTER TABLE fixed_demo_reports ADD COLUMN customers integer DEFAULT 0;
    UPDATE fixed_demo_reports SET customers = customer_count WHERE customers = 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixed_demo_reports' AND column_name = 'lunch_customers'
  ) THEN
    ALTER TABLE fixed_demo_reports ADD COLUMN lunch_customers integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixed_demo_reports' AND column_name = 'dinner_customers'
  ) THEN
    ALTER TABLE fixed_demo_reports ADD COLUMN dinner_customers integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixed_demo_reports' AND column_name = 'report_text'
  ) THEN
    ALTER TABLE fixed_demo_reports ADD COLUMN report_text text;
    UPDATE fixed_demo_reports SET report_text = memo WHERE report_text IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixed_demo_reports' AND column_name = 'rent'
  ) THEN
    ALTER TABLE fixed_demo_reports ADD COLUMN rent numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixed_demo_reports' AND column_name = 'consumables'
  ) THEN
    ALTER TABLE fixed_demo_reports ADD COLUMN consumables numeric DEFAULT 0;
  END IF;
END $$;

-- Reset all data back to single record per day
DELETE FROM fixed_demo_reports WHERE operation_type = 'lunch';
UPDATE fixed_demo_reports SET operation_type = 'full_day' WHERE operation_type = 'dinner';

-- Split the data with variable ratios
DO $$
DECLARE
  demo_report RECORD;
  new_lunch_id uuid;
  lunch_ratio numeric;
  dinner_ratio numeric;
  store_ratios_map jsonb := '{}'::jsonb;
BEGIN
  -- Calculate unique ratio for each store
  FOR demo_report IN
    SELECT DISTINCT store_id FROM fixed_demo_reports
  LOOP
    lunch_ratio := 0.15 + (
      (('x' || substring(demo_report.store_id::text, 1, 8))::bit(32)::bigint % 1000) / 1000.0 * 0.10
    );
    dinner_ratio := 1.0 - lunch_ratio;

    store_ratios_map := jsonb_set(
      store_ratios_map,
      array[demo_report.store_id::text],
      jsonb_build_object('lunch', lunch_ratio, 'dinner', dinner_ratio)
    );

    RAISE NOTICE 'Store %: Lunch %.1f%%, Dinner %.1f%%',
      demo_report.store_id, lunch_ratio * 100, dinner_ratio * 100;
  END LOOP;

  -- Split all records using store-specific ratios
  FOR demo_report IN
    SELECT * FROM fixed_demo_reports
    WHERE operation_type = 'full_day'
    ORDER BY date, store_id
  LOOP
    lunch_ratio := (store_ratios_map->demo_report.store_id::text->>'lunch')::numeric;
    dinner_ratio := (store_ratios_map->demo_report.store_id::text->>'dinner')::numeric;
    new_lunch_id := gen_random_uuid();

    -- Create lunch report
    INSERT INTO fixed_demo_reports (
      id, date, store_id, operation_type, sales, purchase, labor_cost,
      utilities, rent, consumables, promotion, cleaning, misc,
      communication, others, customers, lunch_customers, dinner_customers,
      report_text, created_at
    ) VALUES (
      new_lunch_id, demo_report.date, demo_report.store_id, 'lunch',
      ROUND(demo_report.sales * lunch_ratio), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ROUND(COALESCE(demo_report.customers, demo_report.customer_count, 0) * lunch_ratio),
      ROUND(COALESCE(demo_report.customers, demo_report.customer_count, 0) * lunch_ratio),
      0, 'ランチ営業の売上データ', demo_report.created_at
    );

    -- Update original report to dinner
    UPDATE fixed_demo_reports
    SET
      operation_type = 'dinner',
      sales = ROUND(demo_report.sales * dinner_ratio),
      customers = ROUND(COALESCE(demo_report.customers, demo_report.customer_count, 0) * dinner_ratio),
      lunch_customers = 0,
      dinner_customers = ROUND(COALESCE(demo_report.customers, demo_report.customer_count, 0) * dinner_ratio),
      report_text = 'ディナー営業の売上データ'
    WHERE id = demo_report.id;
  END LOOP;

  RAISE NOTICE 'Demo data successfully split with variable lunch/dinner ratios';
END $$;

COMMENT ON TABLE fixed_demo_reports IS 'Demo daily reports with variable lunch/dinner split - each store has unique ratio (avg lunch 20%, dinner 80%). Expenses are daily totals stored in dinner records only.';
