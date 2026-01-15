/*
  # Add December 2025 Demo Data and Remove September 2025 Data

  1. Data Changes
    - Remove September 2025 data from all demo tables (reports, targets, expenses)
    - Add December 2025 targets to `fixed_demo_targets`
    - Add December 2025 daily reports (1-31 days) to `fixed_demo_reports`
    - Add December 2025 monthly expenses to `fixed_demo_monthly_expenses`
    - Split data into lunch/dinner operations

  2. Purpose
    - Maintain rolling 3-month window (October, November, December)
    - Provide current month data for demonstrations
    - Keep demo data fresh and relevant

  3. Data Patterns
    - Sales and customer counts similar to November levels
    - Lunch: ~20% of daily sales, Dinner: ~80% of daily sales
    - Weekend sales ~20% higher than weekdays
    - Cost ratios: Purchase 32%, Labor 25%, Others 10%
*/

-- Delete September 2025 data from all demo tables
DELETE FROM fixed_demo_reports WHERE date >= '2025-09-01' AND date <= '2025-09-30';
DELETE FROM fixed_demo_targets WHERE period = '2025-09';
DELETE FROM fixed_demo_monthly_expenses WHERE month = '2025-09';

-- Delete existing December data to avoid duplicates
DELETE FROM fixed_demo_reports WHERE date >= '2025-12-01' AND date <= '2025-12-31';
DELETE FROM fixed_demo_targets WHERE period = '2025-12';
DELETE FROM fixed_demo_monthly_expenses WHERE month = '2025-12';

-- Add December 2025 targets for both stores
INSERT INTO fixed_demo_targets (store_id, period, target_sales, target_profit, target_profit_margin, target_cost_rate, target_labor_rate)
VALUES
  ('11111111-1111-1111-1111-111111111111', '2025-12', 26000000, 7800000, 30, 32, 25),
  ('22222222-2222-2222-2222-222222222222', '2025-12', 23000000, 6900000, 30, 32, 25)
ON CONFLICT (store_id, period) DO UPDATE SET
  target_sales = EXCLUDED.target_sales,
  target_profit = EXCLUDED.target_profit,
  target_profit_margin = EXCLUDED.target_profit_margin,
  target_cost_rate = EXCLUDED.target_cost_rate,
  target_labor_rate = EXCLUDED.target_labor_rate;

-- Add December 2025 daily reports (1-31 days for both stores)
-- Insert as full_day first, then split into lunch/dinner
WITH daily_data AS (
  SELECT
    store_id,
    date,
    base_sales,
    base_customers
  FROM (
    VALUES
      -- Store 1 (新宿店) - December 1-31, 2025
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-01'::date, 840000, 178),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-02'::date, 820000, 174),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-03'::date, 850000, 180),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-04'::date, 830000, 176),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-05'::date, 870000, 184),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-06'::date, 950000, 201),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-07'::date, 980000, 207),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-08'::date, 860000, 182),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-09'::date, 840000, 178),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-10'::date, 820000, 174),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-11'::date, 850000, 180),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-12'::date, 870000, 184),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-13'::date, 940000, 199),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-14'::date, 970000, 205),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-15'::date, 850000, 180),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-16'::date, 830000, 176),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-17'::date, 860000, 182),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-18'::date, 840000, 178),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-19'::date, 880000, 186),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-20'::date, 960000, 203),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-21'::date, 1000000, 211),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-22'::date, 870000, 184),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-23'::date, 900000, 190),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-24'::date, 1050000, 222),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-25'::date, 980000, 207),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-26'::date, 920000, 195),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-27'::date, 1020000, 216),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-28'::date, 1080000, 228),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-29'::date, 890000, 188),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-30'::date, 920000, 195),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-12-31'::date, 1100000, 232),

      -- Store 2 (渋谷店) - December 1-31, 2025
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-01'::date, 730000, 162),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-02'::date, 710000, 158),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-03'::date, 740000, 165),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-04'::date, 720000, 160),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-05'::date, 750000, 167),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-06'::date, 820000, 182),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-07'::date, 850000, 188),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-08'::date, 740000, 165),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-09'::date, 730000, 162),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-10'::date, 710000, 158),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-11'::date, 740000, 165),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-12'::date, 760000, 169),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-13'::date, 810000, 180),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-14'::date, 840000, 186),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-15'::date, 740000, 165),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-16'::date, 720000, 160),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-17'::date, 750000, 167),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-18'::date, 730000, 162),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-19'::date, 770000, 171),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-20'::date, 830000, 184),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-21'::date, 870000, 193),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-22'::date, 760000, 169),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-23'::date, 780000, 173),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-24'::date, 910000, 202),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-25'::date, 850000, 188),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-26'::date, 800000, 178),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-27'::date, 880000, 195),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-28'::date, 940000, 208),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-29'::date, 770000, 171),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-30'::date, 800000, 178),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-12-31'::date, 960000, 213)
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
      WHEN EXTRACT(DAY FROM date) % 3 = 0 THEN '雨'
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
      WHEN EXTRACT(DAY FROM date) % 3 = 0 THEN '雨'
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

-- Add monthly expenses for December
INSERT INTO fixed_demo_monthly_expenses (store_id, month, rent, consumables)
VALUES
  ('11111111-1111-1111-1111-111111111111', '2025-12', 1500000, 320000),
  ('22222222-2222-2222-2222-222222222222', '2025-12', 1200000, 260000)
ON CONFLICT (store_id, month) DO UPDATE SET
  rent = EXCLUDED.rent,
  consumables = EXCLUDED.consumables;
