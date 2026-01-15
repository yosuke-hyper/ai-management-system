/*
  # デモ店舗テーブルに釣銭準備金カラムを追加

  1. 変更内容
    - `fixed_demo_stores` テーブルに `change_fund` カラムを追加
    - デフォルト値は NULL（未設定）
    - 既存のデモデータには適切な釣銭準備金を設定

  2. カラム仕様
    - データ型: integer
    - NULL許可: はい
    - コメント: 釣銭準備金（円単位）
*/

-- fixed_demo_stores テーブルに change_fund カラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixed_demo_stores' AND column_name = 'change_fund'
  ) THEN
    ALTER TABLE fixed_demo_stores 
    ADD COLUMN change_fund integer;
    
    COMMENT ON COLUMN fixed_demo_stores.change_fund IS '釣銭準備金（円単位）';
  END IF;
END $$;

-- 既存のデモ店舗にサンプルの釣銭準備金を設定
UPDATE fixed_demo_stores 
SET change_fund = 50000 
WHERE change_fund IS NULL;
