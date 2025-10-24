/*
  # expense_baselines テーブルに不足カラムを追加

  1. 変更内容
    - `open_days` カラムを追加（稼働日数、デフォルト30日）
    - `rent` カラムを追加（賃料）
    - `consumables` カラムを追加（消耗品費）

  2. 理由
    - open_days: 日割り計算に必要
    - rent, consumables: 他のテーブルと整合性を保つため

  3. セキュリティ
    - 既存のRLSポリシーが新カラムにも適用されます
*/

-- open_days カラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expense_baselines' AND column_name = 'open_days'
  ) THEN
    ALTER TABLE expense_baselines ADD COLUMN open_days integer DEFAULT 30;
  END IF;
END $$;

-- rent カラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expense_baselines' AND column_name = 'rent'
  ) THEN
    ALTER TABLE expense_baselines ADD COLUMN rent numeric DEFAULT 0;
  END IF;
END $$;

-- consumables カラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expense_baselines' AND column_name = 'consumables'
  ) THEN
    ALTER TABLE expense_baselines ADD COLUMN consumables numeric DEFAULT 0;
  END IF;
END $$;
