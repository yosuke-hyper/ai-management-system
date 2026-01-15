/*
  # Add November 2025 Demo Data

  1. Data Changes
    - Add November 2025 targets to `fixed_demo_targets`
    - Add November 2025 daily reports (1-24日) to `fixed_demo_reports`
    - Split data into lunch/dinner operations

  2. Purpose
    - Enable weekly view to show current week data
    - Provide realistic recent data for demonstrations
*/

-- Add November 2025 targets for both stores
INSERT INTO fixed_demo_targets (store_id, period, target_sales, target_profit, target_profit_margin, target_cost_rate, target_labor_rate)
VALUES
  ('11111111-1111-1111-1111-111111111111', '2025-11', 25000000, 7500000, 30, 32, 25),
  ('22222222-2222-2222-2222-222222222222', '2025-11', 22000000, 6600000, 30, 32, 25)
ON CONFLICT (store_id, period) DO UPDATE SET
  target_sales = EXCLUDED.target_sales,
  target_profit = EXCLUDED.target_profit,
  target_profit_margin = EXCLUDED.target_profit_margin,
  target_cost_rate = EXCLUDED.target_cost_rate,
  target_labor_rate = EXCLUDED.target_labor_rate;

-- Delete existing November data to avoid duplicates
DELETE FROM fixed_demo_reports WHERE date >= '2025-11-01' AND date <= '2025-11-30';

-- Add November 2025 daily reports (1-24 days for both stores)
-- Insert as full_day first, then split into lunch/dinner
WITH daily_data AS (
  SELECT
    store_id,
    date,
    base_sales,
    base_customers
  FROM (
    VALUES
      -- Store 1 (11111111-1111-1111-1111-111111111111) - November 1-24
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-01'::date, 850000, 180),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-02'::date, 900000, 190),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-03'::date, 920000, 195),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-04'::date, 780000, 165),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-05'::date, 800000, 170),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-06'::date, 820000, 175),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-07'::date, 790000, 168),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-08'::date, 870000, 185),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-09'::date, 930000, 198),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-10'::date, 950000, 200),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-11'::date, 810000, 172),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-12'::date, 830000, 176),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-13'::date, 840000, 178),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-14'::date, 800000, 170),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-15'::date, 880000, 186),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-16'::date, 960000, 203),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-17'::date, 980000, 207),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-18'::date, 820000, 174),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-19'::date, 850000, 180),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-20'::date, 860000, 182),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-21'::date, 830000, 176),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-22'::date, 890000, 188),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-23'::date, 970000, 205),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-24'::date, 990000, 209),

      -- Store 2 (22222222-2222-2222-2222-222222222222) - November 1-24
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-01'::date, 720000, 160),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-02'::date, 750000, 168),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-03'::date, 780000, 172),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-04'::date, 680000, 152),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-05'::date, 700000, 156),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-06'::date, 710000, 158),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-07'::date, 690000, 154),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-08'::date, 740000, 165),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-09'::date, 790000, 175),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-10'::date, 810000, 180),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-11'::date, 710000, 158),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-12'::date, 720000, 160),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-13'::date, 730000, 162),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-14'::date, 700000, 156),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-15'::date, 750000, 167),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-16'::date, 820000, 182),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-17'::date, 840000, 186),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-18'::date, 720000, 160),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-19'::date, 740000, 165),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-20'::date, 750000, 167),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-21'::date, 730000, 162),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-22'::date, 760000, 169),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-23'::date, 830000, 184),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-24'::date, 850000, 188)
  ) AS t(store_id, date, base_sales, base_customers)
),
split_data AS (
  SELECT
    gen_random_uuid() as id,
    store_id,
    date,
    'lunch'::text as operation_type,
    ROUND(base_sales * 0.20) as sales,
    ROUND(base_customers * 0.20) as customers,
    ROUND(base_customers * 0.20) as lunch_customers,
    0 as dinner_customers,
    ROUND(base_sales * 0.20 * 0.32) as purchase,
    ROUND(base_sales * 0.20 * 0.25) as labor_cost,
    ROUND(base_sales * 0.20 * 0.02) as utilities,
    ROUND(base_sales * 0.20 * 0.01) as promotion,
    ROUND(base_sales * 0.20 * 0.01) as cleaning,
    ROUND(base_sales * 0.20 * 0.005) as misc,
    ROUND(base_sales * 0.20 * 0.01) as communication,
    ROUND(base_sales * 0.20 * 0.01) as others,
    50000 as rent,
    ROUND(base_sales * 0.20 * 0.02) as consumables,
    ROUND(base_customers * 0.20) as customer_count,
    CASE
      WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN '晴れ'
      ELSE '曇り'
    END as weather,
    '' as memo,
    '' as report_text
  FROM daily_data
  UNION ALL
  SELECT
    gen_random_uuid() as id,
    store_id,
    date,
    'dinner'::text as operation_type,
    ROUND(base_sales * 0.80) as sales,
    ROUND(base_customers * 0.80) as customers,
    0 as lunch_customers,
    ROUND(base_customers * 0.80) as dinner_customers,
    ROUND(base_sales * 0.80 * 0.32) as purchase,
    ROUND(base_sales * 0.80 * 0.25) as labor_cost,
    ROUND(base_sales * 0.80 * 0.02) as utilities,
    ROUND(base_sales * 0.80 * 0.01) as promotion,
    ROUND(base_sales * 0.80 * 0.01) as cleaning,
    ROUND(base_sales * 0.80 * 0.005) as misc,
    ROUND(base_sales * 0.80 * 0.01) as communication,
    ROUND(base_sales * 0.80 * 0.01) as others,
    50000 as rent,
    ROUND(base_sales * 0.80 * 0.02) as consumables,
    ROUND(base_customers * 0.80) as customer_count,
    CASE
      WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN '晴れ'
      ELSE '曇り'
    END as weather,
    '' as memo,
    '' as report_text
  FROM daily_data
)
INSERT INTO fixed_demo_reports (
  id, store_id, date, operation_type, sales, customers,
  lunch_customers, dinner_customers, purchase, labor_cost, utilities,
  promotion, cleaning, misc, communication, others, rent, consumables,
  customer_count, weather, memo, report_text
)
SELECT
  id, store_id, date, operation_type, sales, customers,
  lunch_customers, dinner_customers, purchase, labor_cost, utilities,
  promotion, cleaning, misc, communication, others, rent, consumables,
  customer_count, weather, memo, report_text
FROM split_data
ORDER BY date, store_id, operation_type;

-- Add monthly expenses for November if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fixed_demo_monthly_expenses') THEN
    INSERT INTO fixed_demo_monthly_expenses (store_id, month, rent, consumables)
    VALUES
      ('11111111-1111-1111-1111-111111111111', '2025-11', 1500000, 300000),
      ('22222222-2222-2222-2222-222222222222', '2025-11', 1200000, 250000)
    ON CONFLICT (store_id, month) DO UPDATE SET
      rent = EXCLUDED.rent,
      consumables = EXCLUDED.consumables;
  END IF;
END $$;
