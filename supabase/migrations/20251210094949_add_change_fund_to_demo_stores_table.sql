/*
  # デモセッション用店舗テーブルに釣銭準備金カラムを追加

  1. 変更内容
    - `demo_stores` テーブルに `change_fund` カラムを追加
    - デフォルト値は NULL（未設定）

  2. カラム仕様
    - データ型: integer
    - NULL許可: はい
    - コメント: 釣銭準備金（円単位）
*/

-- demo_stores テーブルに change_fund カラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'demo_stores' AND column_name = 'change_fund'
  ) THEN
    ALTER TABLE demo_stores 
    ADD COLUMN change_fund integer;
    
    COMMENT ON COLUMN demo_stores.change_fund IS '釣銭準備金（円単位）';
  END IF;
END $$;
