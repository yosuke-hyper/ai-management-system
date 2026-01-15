/*
  # Complete November 2025 Demo Data

  1. Data Changes
    - Add November 25-30, 2025 daily reports to `fixed_demo_reports`
    - Split data into lunch/dinner operations
    - Ensures November has complete month data (30 days)

  2. Purpose
    - Complete the November 2025 data set
    - Provide full month data for accurate monthly analysis
*/

-- Add November 25-30, 2025 daily reports for both stores
WITH daily_data AS (
  SELECT
    store_id,
    date,
    base_sales,
    base_customers
  FROM (
    VALUES
      -- Store 1 (新宿店) - November 25-30
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-25'::date, 820000, 174),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-26'::date, 850000, 180),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-27'::date, 840000, 178),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-28'::date, 830000, 176),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-29'::date, 890000, 188),
      ('11111111-1111-1111-1111-111111111111'::uuid, '2025-11-30'::date, 960000, 203),

      -- Store 2 (渋谷店) - November 25-30
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-25'::date, 710000, 158),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-26'::date, 740000, 165),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-27'::date, 730000, 162),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-28'::date, 720000, 160),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-29'::date, 770000, 171),
      ('22222222-2222-2222-2222-222222222222'::uuid, '2025-11-30'::date, 830000, 184)
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
  ORDER BY date, operation_type
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
ON CONFLICT (store_id, date, operation_type) DO NOTHING;
