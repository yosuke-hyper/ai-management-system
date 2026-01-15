/*
  # Split demo data into lunch and dinner operations

  1. Changes
    - Create lunch reports by copying dinner reports with 40% of sales
    - Update existing reports to be dinner with 60% of sales
    - Apply proportional split for expenses based on sales ratio
    - Maintain data consistency and referential integrity

  2. Strategy
    - Lunch gets 40% of daily sales (typical lunch/dinner ratio)
    - Dinner gets 60% of daily sales
    - All expenses are proportionally split
    - Customer count is also split proportionally

  3. Notes
    - This provides realistic demo data with lunch/dinner split
    - Users can see the benefit of tracking both meal periods
    - Data is generated from existing demo reports
*/

-- First, let's create lunch reports based on existing dinner reports
-- We'll use a 40/60 split (lunch/dinner) which is typical for restaurants

DO $$
DECLARE
  demo_report RECORD;
  new_lunch_id uuid;
BEGIN
  -- Loop through all existing demo reports (currently marked as dinner)
  FOR demo_report IN
    SELECT * FROM fixed_demo_reports
    WHERE operation_type = 'dinner'
    ORDER BY date
  LOOP
    -- Generate new UUID for lunch report
    new_lunch_id := gen_random_uuid();

    -- Create lunch report with 40% of sales
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
      report_text,
      created_at
    ) VALUES (
      new_lunch_id,
      demo_report.date,
      demo_report.store_id,
      'lunch',
      ROUND(demo_report.sales * 0.4), -- 40% of sales
      ROUND(demo_report.purchase * 0.4), -- 40% of purchase
      ROUND(demo_report.labor_cost * 0.4), -- 40% of labor
      ROUND(demo_report.utilities * 0.4), -- 40% of utilities
      ROUND(demo_report.rent * 0.4), -- 40% of rent
      ROUND(demo_report.consumables * 0.4), -- 40% of consumables
      ROUND(demo_report.promotion * 0.4), -- 40% of promotion
      ROUND(demo_report.cleaning * 0.4), -- 40% of cleaning
      ROUND(demo_report.misc * 0.4), -- 40% of misc
      ROUND(demo_report.communication * 0.4), -- 40% of communication
      ROUND(demo_report.others * 0.4), -- 40% of others
      ROUND(demo_report.customers * 0.4), -- 40% of customers
      'ランチ営業の売上データ',
      demo_report.created_at
    );

    -- Update original report to be dinner with 60% of sales
    UPDATE fixed_demo_reports
    SET
      sales = ROUND(demo_report.sales * 0.6),
      purchase = ROUND(demo_report.purchase * 0.6),
      labor_cost = ROUND(demo_report.labor_cost * 0.6),
      utilities = ROUND(demo_report.utilities * 0.6),
      rent = ROUND(demo_report.rent * 0.6),
      consumables = ROUND(demo_report.consumables * 0.6),
      promotion = ROUND(demo_report.promotion * 0.6),
      cleaning = ROUND(demo_report.cleaning * 0.6),
      misc = ROUND(demo_report.misc * 0.6),
      communication = ROUND(demo_report.communication * 0.6),
      others = ROUND(demo_report.others * 0.6),
      customers = ROUND(demo_report.customers * 0.6),
      report_text = 'ディナー営業の売上データ'
    WHERE id = demo_report.id;

    -- Handle vendor purchases if they exist
    -- Copy and split vendor purchases for this report
    INSERT INTO fixed_demo_purchases (
      date,
      store_id,
      vendor_id,
      amount,
      created_at
    )
    SELECT
      date,
      store_id,
      vendor_id,
      ROUND(amount * 0.4), -- 40% for lunch
      created_at
    FROM fixed_demo_purchases
    WHERE date = demo_report.date
      AND store_id = demo_report.store_id;

    -- Update original vendor purchases to 60%
    UPDATE fixed_demo_purchases
    SET amount = ROUND(amount * 0.6)
    WHERE date = demo_report.date
      AND store_id = demo_report.store_id;

  END LOOP;

  RAISE NOTICE 'Demo data successfully split into lunch (40%%) and dinner (60%%) operations';
END $$;

-- Add a comment to document this change
COMMENT ON TABLE fixed_demo_reports IS 'Demo daily reports with lunch/dinner split - lunch typically 40%, dinner 60% of daily sales';
