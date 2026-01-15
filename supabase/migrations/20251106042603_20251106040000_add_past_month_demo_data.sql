/*
  # Add Past Month Demo Data (October 2025)

  1. Data Changes
    - Add October 2025 targets to `fixed_demo_targets`
    - Add October 2025 daily reports to `fixed_demo_reports`
    - Provides 31 days of historical data for testing past month viewing

  2. Purpose
    - Enable users to view past performance data
    - Demonstrate month-to-month comparison functionality
    - Provide complete data set for October 2025
*/

-- Add October 2025 targets for both stores
INSERT INTO fixed_demo_targets (store_id, period, target_sales, target_profit, target_profit_margin, target_cost_rate, target_labor_rate)
VALUES
  ('11111111-1111-1111-1111-111111111111', '2025-10', 24000000, 7200000, 30, 32, 25),
  ('22222222-2222-2222-2222-222222222222', '2025-10', 21000000, 6300000, 30, 32, 25)
ON CONFLICT (store_id, period) DO NOTHING;

-- Add October 2025 daily reports (31 days for both stores)
-- Using realistic daily sales patterns with variations
INSERT INTO fixed_demo_reports (store_id, date, sales, customer_count, purchase, labor_cost, utilities, promotion, cleaning, misc, communication, others, weather)
SELECT
  store_id,
  date,
  CASE
    WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN base_sales * 1.3
    ELSE base_sales
  END * (0.9 + random() * 0.2) AS sales,
  CASE
    WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN base_customers * 1.3
    ELSE base_customers
  END * (0.9 + random() * 0.2) AS customer_count,
  CASE
    WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN base_sales * 1.3 * 0.32
    ELSE base_sales * 0.32
  END * (0.9 + random() * 0.2) AS purchase,
  CASE
    WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN base_sales * 1.3 * 0.25
    ELSE base_sales * 0.25
  END * (0.9 + random() * 0.2) AS labor_cost,
  CASE
    WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN base_sales * 1.3 * 0.02
    ELSE base_sales * 0.02
  END * (0.9 + random() * 0.2) AS utilities,
  CASE
    WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN base_sales * 1.3 * 0.01
    ELSE base_sales * 0.01
  END * (0.9 + random() * 0.2) AS promotion,
  CASE
    WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN base_sales * 1.3 * 0.01
    ELSE base_sales * 0.01
  END * (0.9 + random() * 0.2) AS cleaning,
  CASE
    WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN base_sales * 1.3 * 0.01
    ELSE base_sales * 0.01
  END * (0.9 + random() * 0.2) AS misc,
  CASE
    WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN base_sales * 1.3 * 0.01
    ELSE base_sales * 0.01
  END * (0.9 + random() * 0.2) AS communication,
  CASE
    WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN base_sales * 1.3 * 0.02
    ELSE base_sales * 0.02
  END * (0.9 + random() * 0.2) AS others,
  CASE
    WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN '晴れ'
    ELSE CASE (random() * 3)::int
      WHEN 0 THEN '晴れ'
      WHEN 1 THEN '曇り'
      ELSE '雨'
    END
  END AS weather
FROM (
  SELECT
    '11111111-1111-1111-1111-111111111111'::uuid AS store_id,
    generate_series('2025-10-01'::date, '2025-10-31'::date, '1 day'::interval)::date AS date,
    800000 AS base_sales,
    200 AS base_customers
  UNION ALL
  SELECT
    '22222222-2222-2222-2222-222222222222'::uuid AS store_id,
    generate_series('2025-10-01'::date, '2025-10-31'::date, '1 day'::interval)::date AS date,
    700000 AS base_sales,
    180 AS base_customers
) AS base_data
ON CONFLICT (store_id, date) DO NOTHING;
