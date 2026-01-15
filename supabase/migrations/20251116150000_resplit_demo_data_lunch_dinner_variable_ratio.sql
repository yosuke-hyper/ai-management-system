/*
  # Re-split demo data into lunch and dinner with variable ratios

  1. Overview
    - Delete existing lunch/dinner split data
    - Recreate split with variable ratios per store
    - Average ratio: Lunch 20%, Dinner 80%
    - Store-specific variation: Lunch 15-25%, Dinner 75-85%
    - Expenses remain in dinner records only (as per requirement)

  2. Changes
    - Remove all existing split records
    - Generate new lunch records with store-specific ratios
    - Update dinner records with complementary ratios
    - Maintain expense data only in dinner records

  3. Strategy
    - Use store_id as seed for consistent random ratios per store
    - Lunch ratio range: 15-25% (avg 20%)
    - Dinner ratio range: 75-85% (avg 80%)
    - Split sales and customers only
    - Keep all expenses in dinner records (set to 0 in lunch)

  4. Notes
    - This provides realistic demo data with varied lunch/dinner patterns
    - Each store has consistent ratio across all dates
    - Expenses are daily totals in dinner records
*/

-- First, reset all data back to a single record per day
-- Delete all lunch records
DELETE FROM fixed_demo_reports WHERE operation_type = 'lunch';

-- Reset dinner records to full_day temporarily for recalculation
UPDATE fixed_demo_reports SET operation_type = 'full_day';

-- Now split the data with variable ratios
DO $$
DECLARE
  demo_report RECORD;
  store_lunch_ratio RECORD;
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
    -- Use store_id hash as seed for consistency
    lunch_ratio := 0.15 + (
      -- Hash the store_id to get a consistent pseudo-random value
      (('x' || substring(demo_report.store_id::text, 1, 8))::bit(32)::bigint % 1000) / 1000.0 * 0.10
    );
    dinner_ratio := 1.0 - lunch_ratio;

    -- Store the ratios in a map
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
    -- Get the ratio for this store
    lunch_ratio := (store_ratios_map->demo_report.store_id::text->>'lunch')::numeric;
    dinner_ratio := (store_ratios_map->demo_report.store_id::text->>'dinner')::numeric;

    -- Generate new UUID for lunch report
    new_lunch_id := gen_random_uuid();

    -- Create lunch report with calculated ratio
    -- IMPORTANT: All expenses set to 0 for lunch (expenses only in dinner)
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
      0, -- Expenses only in dinner
      0, -- Expenses only in dinner
      0, -- Expenses only in dinner
      0, -- Expenses only in dinner
      0, -- Expenses only in dinner
      0, -- Expenses only in dinner
      0, -- Expenses only in dinner
      0, -- Expenses only in dinner
      0, -- Expenses only in dinner
      0, -- Expenses only in dinner
      ROUND(demo_report.customers * lunch_ratio),
      ROUND(demo_report.customers * lunch_ratio), -- lunch_customers
      0, -- No dinner customers in lunch record
      'ランチ営業の売上データ',
      demo_report.created_at
    );

    -- Update original report to be dinner with complementary ratio
    -- Keep all expenses in dinner record (daily total)
    UPDATE fixed_demo_reports
    SET
      operation_type = 'dinner',
      sales = ROUND(demo_report.sales * dinner_ratio),
      customers = ROUND(demo_report.customers * dinner_ratio),
      lunch_customers = 0, -- No lunch customers in dinner record
      dinner_customers = ROUND(demo_report.customers * dinner_ratio),
      report_text = 'ディナー営業の売上データ'
      -- NOTE: All expense fields (purchase, labor_cost, etc.) remain unchanged
      -- They represent the full day's expenses in the dinner record
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
    -- Get a sample date to check ratio
    SELECT
      SUM(CASE WHEN operation_type = 'lunch' THEN sales ELSE 0 END) as lunch_s,
      SUM(CASE WHEN operation_type = 'dinner' THEN sales ELSE 0 END) as dinner_s,
      SUM(sales) as total_s
    INTO lunch_sales, dinner_sales, total_sales
    FROM fixed_demo_reports
    WHERE store_id = store_rec.store_id
      AND date = (SELECT MIN(date) FROM fixed_demo_reports WHERE store_id = store_rec.store_id);

    lunch_pct := (lunch_sales / total_sales * 100);

    RAISE NOTICE 'Store % - Lunch: %.1f%%, Dinner: %.1f%%',
      store_rec.store_id,
      lunch_pct,
      (dinner_sales / total_sales * 100);
  END LOOP;
END $$;

-- Add comments
COMMENT ON TABLE fixed_demo_reports IS 'Demo daily reports with variable lunch/dinner split - each store has unique ratio (avg lunch 20%, dinner 80%). Expenses are daily totals stored in dinner records only.';
