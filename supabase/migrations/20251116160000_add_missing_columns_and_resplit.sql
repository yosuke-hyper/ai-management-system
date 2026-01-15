/*
  # Add missing columns and re-split demo data into lunch/dinner

  1. Schema Changes
    - Add missing columns: customers, lunch_customers, dinner_customers, report_text
    - Add rent and consumables columns if not exist

  2. Data Split
    - Delete existing lunch/dinner split data
    - Recreate split with variable ratios per store
    - Average ratio: Lunch 20%, Dinner 80%
    - Store-specific variation: Lunch 15-25%, Dinner 75-85%
    - Expenses remain in dinner records only
*/

-- Add missing columns to fixed_demo_reports if they don't exist
DO $$
BEGIN
  -- Add customers column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixed_demo_reports' AND column_name = 'customers'
  ) THEN
    ALTER TABLE fixed_demo_reports ADD COLUMN customers integer DEFAULT 0;
    -- Copy customer_count to customers for existing data
    UPDATE fixed_demo_reports SET customers = customer_count WHERE customers = 0;
  END IF;

  -- Add lunch_customers column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixed_demo_reports' AND column_name = 'lunch_customers'
  ) THEN
    ALTER TABLE fixed_demo_reports ADD COLUMN lunch_customers integer DEFAULT 0;
  END IF;

  -- Add dinner_customers column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixed_demo_reports' AND column_name = 'dinner_customers'
  ) THEN
    ALTER TABLE fixed_demo_reports ADD COLUMN dinner_customers integer DEFAULT 0;
  END IF;

  -- Add report_text column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixed_demo_reports' AND column_name = 'report_text'
  ) THEN
    ALTER TABLE fixed_demo_reports ADD COLUMN report_text text;
    -- Copy memo to report_text for existing data
    UPDATE fixed_demo_reports SET report_text = memo WHERE report_text IS NULL;
  END IF;

  -- Add rent column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixed_demo_reports' AND column_name = 'rent'
  ) THEN
    ALTER TABLE fixed_demo_reports ADD COLUMN rent numeric DEFAULT 0;
  END IF;

  -- Add consumables column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixed_demo_reports' AND column_name = 'consumables'
  ) THEN
    ALTER TABLE fixed_demo_reports ADD COLUMN consumables numeric DEFAULT 0;
  END IF;
END $$;

-- Reset all data back to a single record per day
DELETE FROM fixed_demo_reports WHERE operation_type = 'lunch';
UPDATE fixed_demo_reports SET operation_type = 'full_day' WHERE operation_type = 'dinner';

-- Now split the data with variable ratios
DO $$
DECLARE
  demo_report RECORD;
  new_lunch_id uuid;
  lunch_ratio numeric;
  dinner_ratio numeric;
  store_ratios_map jsonb := '{}'::jsonb;
BEGIN
  -- First pass: Calculate unique ratio for each store
  FOR demo_report IN
    SELECT DISTINCT store_id FROM fixed_demo_reports
  LOOP
    -- Generate store-specific ratio (15-25% for lunch)
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

  -- Second pass: Split all records using store-specific ratios
  FOR demo_report IN
    SELECT * FROM fixed_demo_reports
    WHERE operation_type = 'full_day'
    ORDER BY date, store_id
  LOOP
    lunch_ratio := (store_ratios_map->demo_report.store_id::text->>'lunch')::numeric;
    dinner_ratio := (store_ratios_map->demo_report.store_id::text->>'dinner')::numeric;
    new_lunch_id := gen_random_uuid();

    -- Create lunch report with calculated ratio
    INSERT INTO fixed_demo_reports (
      id,
      date,
      store_id,
      operation_type,
      sales,
      purchase,
      labor_cost,
      utilities,
      rent,
      consumables,
      promotion,
      cleaning,
      misc,
      communication,
      others,
      customers,
      lunch_customers,
      dinner_customers,
      report_text,
      created_at
    ) VALUES (
      new_lunch_id,
      demo_report.date,
      demo_report.store_id,
      'lunch',
      ROUND(demo_report.sales * lunch_ratio),
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      ROUND(COALESCE(demo_report.customers, demo_report.customer_count, 0) * lunch_ratio),
      ROUND(COALESCE(demo_report.customers, demo_report.customer_count, 0) * lunch_ratio),
      0,
      'ランチ営業の売上データ',
      demo_report.created_at
    );

    -- Update original report to be dinner with complementary ratio
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

  RAISE NOTICE 'Demo data successfully split with variable lunch/dinner ratios (avg 20%%/80%%)';
END $$;

-- Verify the split
DO $$
DECLARE
  store_rec RECORD;
  total_sales numeric;
  lunch_sales numeric;
  dinner_sales numeric;
  lunch_pct numeric;
BEGIN
  FOR store_rec IN
    SELECT DISTINCT store_id FROM fixed_demo_reports ORDER BY store_id
  LOOP
    SELECT
      SUM(CASE WHEN operation_type = 'lunch' THEN sales ELSE 0 END) as lunch_s,
      SUM(CASE WHEN operation_type = 'dinner' THEN sales ELSE 0 END) as dinner_s,
      SUM(sales) as total_s
    INTO lunch_sales, dinner_sales, total_sales
    FROM fixed_demo_reports
    WHERE store_id = store_rec.store_id
      AND date = (SELECT MIN(date) FROM fixed_demo_reports WHERE store_id = store_rec.store_id);

    IF total_sales > 0 THEN
      lunch_pct := (lunch_sales / total_sales * 100);
      RAISE NOTICE 'Store % - Lunch: %.1f%%, Dinner: %.1f%%',
        store_rec.store_id,
        lunch_pct,
        (dinner_sales / total_sales * 100);
    END IF;
  END LOOP;
END $$;

COMMENT ON TABLE fixed_demo_reports IS 'Demo daily reports with variable lunch/dinner split - each store has unique ratio (avg lunch 20%, dinner 80%). Expenses are daily totals stored in dinner records only.';
