/*
  # 店舗テーブルに釣銭準備金カラムを追加

  1. Changes
    - `stores`テーブルに`change_fund`カラムを追加
      - データ型: integer（円単位）
      - NULL許可（未設定可能）
      - デフォルト値: NULL

  2. Notes
    - 既存店舗データには影響なし（NULLとして扱われる）
    - フロントエンドでNULL値は0または未設定として表示
    - 月次売上エクスポートで使用される
*/

-- Add change_fund column to stores table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'change_fund'
  ) THEN
    ALTER TABLE stores ADD COLUMN change_fund integer DEFAULT NULL;

    COMMENT ON COLUMN stores.change_fund IS '釣銭準備金（円単位）';
  END IF;
END $$;
