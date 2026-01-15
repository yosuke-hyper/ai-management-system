/*
  # 固定デモデータシステム（パターン1実装）

  1. 概要
    - 共通のデモ組織を1つ作成
    - 2店舗のみ（新宿店、渋谷店）
    - 過去3ヶ月分の日報データを生成
    - 月次経費データを作成
    - すべてのデモユーザーが同じデータを閲覧

  2. 新規テーブル
    - `fixed_demo_organization` - 固定デモ組織（1レコードのみ）
    - `fixed_demo_stores` - 固定デモ店舗（2店舗）
    - `fixed_demo_reports` - 固定デモ日報データ
    - `fixed_demo_monthly_expenses` - 固定デモ月次経費データ
    - `fixed_demo_targets` - 固定デモ目標データ

  3. セキュリティ
    - RLS有効化、全員が読み取り可能（SELECT）
    - 書き込みは禁止（INSERT/UPDATE/DELETE不可）

  4. データ
    - 実際のサンプルデータをマイグレーション時に投入
*/

-- 固定デモ組織テーブル
CREATE TABLE IF NOT EXISTS fixed_demo_organization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'デモ組織',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fixed_demo_organization ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fixed demo organization"
  ON fixed_demo_organization
  FOR SELECT
  USING (true);

-- 固定デモ店舗テーブル
CREATE TABLE IF NOT EXISTS fixed_demo_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fixed_demo_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fixed demo stores"
  ON fixed_demo_stores
  FOR SELECT
  USING (true);

-- 固定デモ日報テーブル
CREATE TABLE IF NOT EXISTS fixed_demo_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES fixed_demo_stores(id) ON DELETE CASCADE,
  date date NOT NULL,
  sales numeric DEFAULT 0,
  customer_count integer DEFAULT 0,
  labor_cost_employee numeric DEFAULT 0,
  labor_cost_part_time numeric DEFAULT 0,
  food_cost numeric DEFAULT 0,
  beverage_cost numeric DEFAULT 0,
  utilities numeric DEFAULT 0,
  promotion numeric DEFAULT 0,
  cleaning numeric DEFAULT 0,
  misc numeric DEFAULT 0,
  communication numeric DEFAULT 0,
  memo text,
  weather text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_id, date)
);

ALTER TABLE fixed_demo_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fixed demo reports"
  ON fixed_demo_reports
  FOR SELECT
  USING (true);

-- 固定デモ月次経費テーブル
CREATE TABLE IF NOT EXISTS fixed_demo_monthly_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES fixed_demo_stores(id) ON DELETE CASCADE,
  month text NOT NULL,
  labor_cost_employee numeric DEFAULT 0,
  labor_cost_part_time numeric DEFAULT 0,
  utilities numeric DEFAULT 0,
  rent numeric DEFAULT 0,
  consumables numeric DEFAULT 0,
  promotion numeric DEFAULT 0,
  cleaning numeric DEFAULT 0,
  misc numeric DEFAULT 0,
  communication numeric DEFAULT 0,
  others numeric DEFAULT 0,
  memo text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_id, month)
);

ALTER TABLE fixed_demo_monthly_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fixed demo monthly expenses"
  ON fixed_demo_monthly_expenses
  FOR SELECT
  USING (true);

-- 固定デモ目標テーブル
CREATE TABLE IF NOT EXISTS fixed_demo_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES fixed_demo_stores(id) ON DELETE CASCADE,
  month text NOT NULL,
  sales_target numeric DEFAULT 0,
  customer_count_target integer DEFAULT 0,
  labor_cost_rate_target numeric DEFAULT 0,
  food_cost_rate_target numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_id, month)
);

ALTER TABLE fixed_demo_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fixed demo targets"
  ON fixed_demo_targets
  FOR SELECT
  USING (true);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_fixed_demo_reports_store ON fixed_demo_reports(store_id);
CREATE INDEX IF NOT EXISTS idx_fixed_demo_reports_date ON fixed_demo_reports(date);
CREATE INDEX IF NOT EXISTS idx_fixed_demo_monthly_expenses_store ON fixed_demo_monthly_expenses(store_id);
CREATE INDEX IF NOT EXISTS idx_fixed_demo_targets_store ON fixed_demo_targets(store_id);

-- サンプルデータ投入

-- 固定デモ組織を作成
INSERT INTO fixed_demo_organization (name) VALUES ('デモカフェチェーン') ON CONFLICT DO NOTHING;

-- 2店舗を作成
INSERT INTO fixed_demo_stores (id, name, location) VALUES
  ('11111111-1111-1111-1111-111111111111', '新宿店', '東京都新宿区'),
  ('22222222-2222-2222-2222-222222222222', '渋谷店', '東京都渋谷区')
ON CONFLICT (id) DO NOTHING;

-- 過去3ヶ月分の日報データを生成（新宿店）
DO $$
DECLARE
  v_store_id uuid := '11111111-1111-1111-1111-111111111111';
  start_date date := CURRENT_DATE - interval '90 days';
  end_date date := CURRENT_DATE - interval '1 day';
  loop_date date;
  base_sales numeric;
  base_customers integer;
BEGIN
  loop_date := start_date;
  WHILE loop_date <= end_date LOOP
    IF EXTRACT(DOW FROM loop_date) IN (0, 6) THEN
      base_sales := 800000 + (random() * 200000);
      base_customers := 180 + (random() * 40)::integer;
    ELSE
      base_sales := 500000 + (random() * 150000);
      base_customers := 120 + (random() * 30)::integer;
    END IF;

    INSERT INTO fixed_demo_reports (
      store_id, date, sales, customer_count,
      labor_cost_employee, labor_cost_part_time,
      food_cost, beverage_cost, utilities,
      promotion, cleaning, misc, communication,
      weather, memo
    ) VALUES (
      v_store_id, loop_date, base_sales, base_customers,
      base_sales * 0.15, base_sales * 0.10,
      base_sales * 0.28, base_sales * 0.08, 15000,
      5000, 3000, 2000, 1000,
      CASE (random() * 3)::integer
        WHEN 0 THEN '晴れ'
        WHEN 1 THEN '曇り'
        ELSE '雨'
      END,
      'デモデータ'
    ) ON CONFLICT (store_id, date) DO NOTHING;

    loop_date := loop_date + interval '1 day';
  END LOOP;
END $$;

-- 過去3ヶ月分の日報データを生成（渋谷店）
DO $$
DECLARE
  v_store_id uuid := '22222222-2222-2222-2222-222222222222';
  start_date date := CURRENT_DATE - interval '90 days';
  end_date date := CURRENT_DATE - interval '1 day';
  loop_date date;
  base_sales numeric;
  base_customers integer;
BEGIN
  loop_date := start_date;
  WHILE loop_date <= end_date LOOP
    IF EXTRACT(DOW FROM loop_date) IN (0, 6) THEN
      base_sales := 700000 + (random() * 180000);
      base_customers := 160 + (random() * 35)::integer;
    ELSE
      base_sales := 450000 + (random() * 130000);
      base_customers := 110 + (random() * 25)::integer;
    END IF;

    INSERT INTO fixed_demo_reports (
      store_id, date, sales, customer_count,
      labor_cost_employee, labor_cost_part_time,
      food_cost, beverage_cost, utilities,
      promotion, cleaning, misc, communication,
      weather, memo
    ) VALUES (
      v_store_id, loop_date, base_sales, base_customers,
      base_sales * 0.16, base_sales * 0.11,
      base_sales * 0.30, base_sales * 0.09, 14000,
      4500, 2800, 1800, 950,
      CASE (random() * 3)::integer
        WHEN 0 THEN '晴れ'
        WHEN 1 THEN '曇り'
        ELSE '雨'
      END,
      'デモデータ'
    ) ON CONFLICT (store_id, date) DO NOTHING;

    loop_date := loop_date + interval '1 day';
  END LOOP;
END $$;

-- 過去3ヶ月分の月次経費データ（新宿店）
DO $$
DECLARE
  v_store_id uuid := '11111111-1111-1111-1111-111111111111';
  month_str text;
BEGIN
  FOR i IN 0..2 LOOP
    month_str := TO_CHAR(CURRENT_DATE - (i || ' months')::interval, 'YYYY-MM');
    INSERT INTO fixed_demo_monthly_expenses (
      store_id, month,
      labor_cost_employee, labor_cost_part_time,
      utilities, rent, consumables, promotion,
      cleaning, misc, communication, others, memo
    ) VALUES (
      v_store_id, month_str,
      3000000, 1800000,
      450000, 800000, 180000, 150000,
      90000, 60000, 45000, 30000,
      'デモデータ'
    ) ON CONFLICT (store_id, month) DO NOTHING;
  END LOOP;
END $$;

-- 過去3ヶ月分の月次経費データ（渋谷店）
DO $$
DECLARE
  v_store_id uuid := '22222222-2222-2222-2222-222222222222';
  month_str text;
BEGIN
  FOR i IN 0..2 LOOP
    month_str := TO_CHAR(CURRENT_DATE - (i || ' months')::interval, 'YYYY-MM');
    INSERT INTO fixed_demo_monthly_expenses (
      store_id, month,
      labor_cost_employee, labor_cost_part_time,
      utilities, rent, consumables, promotion,
      cleaning, misc, communication, others, memo
    ) VALUES (
      v_store_id, month_str,
      2800000, 1600000,
      420000, 750000, 165000, 135000,
      85000, 55000, 42000, 28000,
      'デモデータ'
    ) ON CONFLICT (store_id, month) DO NOTHING;
  END LOOP;
END $$;

-- 目標データ（新宿店）
DO $$
DECLARE
  v_store_id uuid := '11111111-1111-1111-1111-111111111111';
  month_str text;
BEGIN
  FOR i IN 0..2 LOOP
    month_str := TO_CHAR(CURRENT_DATE - (i || ' months')::interval, 'YYYY-MM');
    INSERT INTO fixed_demo_targets (
      store_id, month, sales_target, customer_count_target,
      labor_cost_rate_target, food_cost_rate_target
    ) VALUES (
      v_store_id, month_str, 18000000, 4200, 25.0, 30.0
    ) ON CONFLICT (store_id, month) DO NOTHING;
  END LOOP;
END $$;

-- 目標データ（渋谷店）
DO $$
DECLARE
  v_store_id uuid := '22222222-2222-2222-2222-222222222222';
  month_str text;
BEGIN
  FOR i IN 0..2 LOOP
    month_str := TO_CHAR(CURRENT_DATE - (i || ' months')::interval, 'YYYY-MM');
    INSERT INTO fixed_demo_targets (
      store_id, month, sales_target, customer_count_target,
      labor_cost_rate_target, food_cost_rate_target
    ) VALUES (
      v_store_id, month_str, 16000000, 3800, 26.0, 32.0
    ) ON CONFLICT (store_id, month) DO NOTHING;
  END LOOP;
END $$;

COMMENT ON TABLE fixed_demo_organization IS '固定デモ組織（全ユーザー共通）';
COMMENT ON TABLE fixed_demo_stores IS '固定デモ店舗（2店舗のみ）';
COMMENT ON TABLE fixed_demo_reports IS '固定デモ日報データ（過去3ヶ月）';
COMMENT ON TABLE fixed_demo_monthly_expenses IS '固定デモ月次経費データ';
COMMENT ON TABLE fixed_demo_targets IS '固定デモ目標データ';
