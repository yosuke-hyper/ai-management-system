/*
  # 経費項目の追加

  1. 変更内容
    - 賃料(rent)カラムを追加
    - 消耗品費(consumables)カラムを追加
    - 光熱費は水道光熱費として扱う（カラム名utilitiesはそのまま）

  2. テーブル変更
    - `daily_reports`テーブルに2つの新カラムを追加
    - `monthly_expenses`テーブルに2つの新カラムを追加

  3. セキュリティ
    - 既存のRLSポリシーが新カラムにも適用されます
*/

-- daily_reportsテーブルに賃料と消耗品費を追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_reports' AND column_name = 'rent'
  ) THEN
    ALTER TABLE daily_reports ADD COLUMN rent integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_reports' AND column_name = 'consumables'
  ) THEN
    ALTER TABLE daily_reports ADD COLUMN consumables integer DEFAULT 0;
  END IF;
END $$;

-- monthly_expensesテーブルに賃料と消耗品費を追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'monthly_expenses' AND column_name = 'rent'
  ) THEN
    ALTER TABLE monthly_expenses ADD COLUMN rent integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'monthly_expenses' AND column_name = 'consumables'
  ) THEN
    ALTER TABLE monthly_expenses ADD COLUMN consumables integer DEFAULT 0;
  END IF;
END $$;
