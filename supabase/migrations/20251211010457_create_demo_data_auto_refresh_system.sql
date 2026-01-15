/*
  # Create Automatic Demo Data Refresh System

  1. New Functions
    - `refresh_demo_data()` - Main function to maintain rolling 3-month window
    - `generate_demo_month_data(target_month date)` - Generate all data for a specific month
    - `get_demo_base_values(store_id uuid)` - Get base sales/customer values per store

  2. Purpose
    - Automatically maintain recent 3 months of demo data
    - Remove data older than 4 months
    - Generate realistic data patterns based on historical averages

  3. Automation
    - Can be called manually from admin interface
    - Can be scheduled with pg_cron for monthly execution
    - Ensures demo environment always has fresh, relevant data

  4. Data Generation Logic
    - Weekend sales ~20% higher than weekdays
    - Lunch: 20% of daily total, Dinner: 80% of daily total
    - Cost ratios maintained: Purchase 32%, Labor 25%
    - Weather patterns: Weekends sunny, weekdays varied
*/

-- Function to get base values for each store
CREATE OR REPLACE FUNCTION get_demo_base_values(p_store_id uuid)
RETURNS TABLE (
  base_daily_sales integer,
  base_daily_customers integer
) AS $$
BEGIN
  -- Return base values per store
  -- 新宿店 (11111111-1111-1111-1111-111111111111): Higher volume
  -- 渋谷店 (22222222-2222-2222-2222-222222222222): Medium volume
  IF p_store_id = '11111111-1111-1111-1111-111111111111'::uuid THEN
    RETURN QUERY SELECT 850000, 180;
  ELSIF p_store_id = '22222222-2222-2222-2222-222222222222'::uuid THEN
    RETURN QUERY SELECT 740000, 165;
  ELSE
    -- Default values for unknown stores
    RETURN QUERY SELECT 800000, 170;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to generate demo data for a specific month
CREATE OR REPLACE FUNCTION generate_demo_month_data(target_month date)
RETURNS void AS $$
DECLARE
  v_store_id uuid;
  v_date date;
  v_days_in_month integer;
  v_base_sales integer;
  v_base_customers integer;
  v_daily_sales integer;
  v_daily_customers integer;
  v_weather text;
  v_day_of_week integer;
  v_sales_multiplier numeric;
BEGIN
  -- Get number of days in the target month
  v_days_in_month := EXTRACT(DAY FROM (date_trunc('month', target_month) + interval '1 month' - interval '1 day')::date);
  
  -- Loop through both demo stores
  FOR v_store_id IN 
    SELECT unnest(ARRAY[
      '11111111-1111-1111-1111-111111111111'::uuid,
      '22222222-2222-2222-2222-222222222222'::uuid
    ])
  LOOP
    -- Get base values for this store
    SELECT base_daily_sales, base_daily_customers
    INTO v_base_sales, v_base_customers
    FROM get_demo_base_values(v_store_id);
    
    -- Generate daily data for this month
    FOR i IN 1..v_days_in_month LOOP
      v_date := date_trunc('month', target_month)::date + (i - 1);
      v_day_of_week := EXTRACT(DOW FROM v_date);
      
      -- Determine sales multiplier based on day of week
      -- Weekends (0=Sunday, 6=Saturday): 1.15x
      -- Weekdays: 0.95-1.05x with variation
      IF v_day_of_week IN (0, 6) THEN
        v_sales_multiplier := 1.15;
      ELSE
        v_sales_multiplier := 0.95 + (random() * 0.10);
      END IF;
      
      v_daily_sales := ROUND(v_base_sales * v_sales_multiplier);
      v_daily_customers := ROUND(v_base_customers * v_sales_multiplier);
      
      -- Determine weather
      IF v_day_of_week IN (0, 6) THEN
        v_weather := '晴れ';
      ELSIF i % 3 = 0 THEN
        v_weather := '雨';
      ELSE
        v_weather := '曇り';
      END IF;
      
      -- Insert lunch record (20% of daily)
      INSERT INTO fixed_demo_reports (
        id, store_id, date, operation_type, sales, customers,
        lunch_customers, dinner_customers, purchase, labor_cost, utilities,
        promotion, cleaning, misc, communication, others, rent, consumables,
        customer_count, weather, memo, report_text
      ) VALUES (
        gen_random_uuid(),
        v_store_id,
        v_date,
        'lunch',
        ROUND(v_daily_sales * 0.20),
        ROUND(v_daily_customers * 0.20),
        ROUND(v_daily_customers * 0.20),
        0,
        ROUND(v_daily_sales * 0.20 * 0.32),
        ROUND(v_daily_sales * 0.20 * 0.25),
        ROUND(v_daily_sales * 0.20 * 0.02),
        ROUND(v_daily_sales * 0.20 * 0.01),
        ROUND(v_daily_sales * 0.20 * 0.01),
        ROUND(v_daily_sales * 0.20 * 0.005),
        ROUND(v_daily_sales * 0.20 * 0.01),
        ROUND(v_daily_sales * 0.20 * 0.01),
        50000,
        ROUND(v_daily_sales * 0.20 * 0.02),
        ROUND(v_daily_customers * 0.20),
        v_weather,
        '',
        ''
      );
      
      -- Insert dinner record (80% of daily)
      INSERT INTO fixed_demo_reports (
        id, store_id, date, operation_type, sales, customers,
        lunch_customers, dinner_customers, purchase, labor_cost, utilities,
        promotion, cleaning, misc, communication, others, rent, consumables,
        customer_count, weather, memo, report_text
      ) VALUES (
        gen_random_uuid(),
        v_store_id,
        v_date,
        'dinner',
        ROUND(v_daily_sales * 0.80),
        ROUND(v_daily_customers * 0.80),
        0,
        ROUND(v_daily_customers * 0.80),
        ROUND(v_daily_sales * 0.80 * 0.32),
        ROUND(v_daily_sales * 0.80 * 0.25),
        ROUND(v_daily_sales * 0.80 * 0.02),
        ROUND(v_daily_sales * 0.80 * 0.01),
        ROUND(v_daily_sales * 0.80 * 0.01),
        ROUND(v_daily_sales * 0.80 * 0.005),
        ROUND(v_daily_sales * 0.80 * 0.01),
        ROUND(v_daily_sales * 0.80 * 0.01),
        50000,
        ROUND(v_daily_sales * 0.80 * 0.02),
        ROUND(v_daily_customers * 0.80),
        v_weather,
        '',
        ''
      );
    END LOOP;
    
    -- Insert monthly target
    INSERT INTO fixed_demo_targets (store_id, period, target_sales, target_profit, target_profit_margin, target_cost_rate, target_labor_rate)
    VALUES (
      v_store_id,
      to_char(target_month, 'YYYY-MM'),
      v_base_sales * v_days_in_month,
      ROUND(v_base_sales * v_days_in_month * 0.30),
      30,
      32,
      25
    )
    ON CONFLICT (store_id, period) DO UPDATE SET
      target_sales = EXCLUDED.target_sales,
      target_profit = EXCLUDED.target_profit,
      target_profit_margin = EXCLUDED.target_profit_margin,
      target_cost_rate = EXCLUDED.target_cost_rate,
      target_labor_rate = EXCLUDED.target_labor_rate;
    
    -- Insert monthly expenses
    INSERT INTO fixed_demo_monthly_expenses (store_id, month, rent, consumables)
    VALUES (
      v_store_id,
      to_char(target_month, 'YYYY-MM'),
      CASE WHEN v_store_id = '11111111-1111-1111-1111-111111111111'::uuid THEN 1500000 ELSE 1200000 END,
      CASE WHEN v_store_id = '11111111-1111-1111-1111-111111111111'::uuid THEN 300000 ELSE 250000 END
    )
    ON CONFLICT (store_id, month) DO UPDATE SET
      rent = EXCLUDED.rent,
      consumables = EXCLUDED.consumables;
  END LOOP;
  
  RAISE NOTICE 'Generated demo data for month: %', to_char(target_month, 'YYYY-MM');
END;
$$ LANGUAGE plpgsql;

-- Main function to refresh demo data (maintain 3-month rolling window)
CREATE OR REPLACE FUNCTION refresh_demo_data()
RETURNS TABLE (
  action text,
  month_affected text,
  details text
) AS $$
DECLARE
  v_current_month date;
  v_oldest_allowed_month date;
  v_month_to_check date;
  v_data_exists boolean;
  v_deleted_count integer;
BEGIN
  -- Get current month (first day)
  v_current_month := date_trunc('month', CURRENT_DATE)::date;
  
  -- Calculate oldest allowed month (3 months ago)
  v_oldest_allowed_month := (v_current_month - interval '2 months')::date;
  
  RAISE NOTICE 'Starting demo data refresh. Current month: %, Oldest allowed: %', v_current_month, v_oldest_allowed_month;
  
  -- Step 1: Delete data older than 4 months
  DELETE FROM fixed_demo_reports
  WHERE date < v_oldest_allowed_month;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count > 0 THEN
    RETURN QUERY SELECT 
      'DELETED'::text,
      to_char(v_oldest_allowed_month - interval '1 month', 'YYYY-MM')::text,
      format('Removed %s old report records', v_deleted_count)::text;
  END IF;
  
  DELETE FROM fixed_demo_targets
  WHERE to_date(period || '-01', 'YYYY-MM-DD') < v_oldest_allowed_month;
  
  DELETE FROM fixed_demo_monthly_expenses
  WHERE to_date(month || '-01', 'YYYY-MM-DD') < v_oldest_allowed_month;
  
  -- Step 2: Check and generate missing months (last 3 months)
  FOR i IN 0..2 LOOP
    v_month_to_check := (v_current_month - (i || ' months')::interval)::date;
    
    -- Check if data exists for this month
    SELECT EXISTS (
      SELECT 1 FROM fixed_demo_reports
      WHERE date >= v_month_to_check
        AND date < (v_month_to_check + interval '1 month')::date
      LIMIT 1
    ) INTO v_data_exists;
    
    IF NOT v_data_exists THEN
      -- Generate data for this month
      PERFORM generate_demo_month_data(v_month_to_check);
      
      RETURN QUERY SELECT 
        'GENERATED'::text,
        to_char(v_month_to_check, 'YYYY-MM')::text,
        'Created new demo data for month'::text;
    ELSE
      RETURN QUERY SELECT 
        'EXISTS'::text,
        to_char(v_month_to_check, 'YYYY-MM')::text,
        'Data already present'::text;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT 
    'COMPLETED'::text,
    to_char(v_current_month, 'YYYY-MM')::text,
    'Demo data refresh completed successfully'::text;
END;
$$ LANGUAGE plpgsql;

-- Create a simplified manual trigger function for admins
CREATE OR REPLACE FUNCTION trigger_demo_data_refresh()
RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_agg(row_to_json(t))
  INTO v_result
  FROM refresh_demo_data() t;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_demo_base_values(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_demo_month_data(date) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_demo_data() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_demo_data_refresh() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION refresh_demo_data() IS 'Maintains a rolling 3-month window of demo data. Removes old data and generates missing months automatically.';
COMMENT ON FUNCTION trigger_demo_data_refresh() IS 'Admin-friendly function that returns JSON result of demo data refresh operation.';
