/*
  # 固定デモレポートのテーブル構造を修正

  1. 変更内容
    - food_cost と beverage_cost を purchase カラムに統合
    - labor_cost_employee と labor_cost_part_time を labor_cost カラムに統合
    - others カラムを追加
    - daily_reports と同じ構造に統一

  2. データ移行
    - 既存データを新しい構造に変換
*/

-- 新しいカラムを追加
ALTER TABLE fixed_demo_reports 
  ADD COLUMN IF NOT EXISTS purchase numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS others numeric DEFAULT 0;

-- 既存データを移行（food_cost + beverage_cost = purchase）
UPDATE fixed_demo_reports
SET purchase = COALESCE(food_cost, 0) + COALESCE(beverage_cost, 0);

-- 既存データを移行（labor_cost_employee + labor_cost_part_time = labor_cost）
UPDATE fixed_demo_reports
SET labor_cost = COALESCE(labor_cost_employee, 0) + COALESCE(labor_cost_part_time, 0);

-- 古いカラムを削除
ALTER TABLE fixed_demo_reports 
  DROP COLUMN IF EXISTS food_cost,
  DROP COLUMN IF EXISTS beverage_cost,
  DROP COLUMN IF EXISTS labor_cost_employee,
  DROP COLUMN IF EXISTS labor_cost_part_time;

-- 固定デモ月次経費も同様に修正
ALTER TABLE fixed_demo_monthly_expenses
  ADD COLUMN IF NOT EXISTS labor_cost numeric DEFAULT 0;

UPDATE fixed_demo_monthly_expenses
SET labor_cost = COALESCE(labor_cost_employee, 0) + COALESCE(labor_cost_part_time, 0);

ALTER TABLE fixed_demo_monthly_expenses
  DROP COLUMN IF EXISTS labor_cost_employee,
  DROP COLUMN IF EXISTS labor_cost_part_time;