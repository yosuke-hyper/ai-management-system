/*
  # ai_usage_settingsにmonthly_allocationカラムを追加

  ## 変更内容
  - `monthly_allocation` (integer) カラムを追加
  - デフォルト値: 100回/月

  ## 既存データの更新
  - daily_limitから概算値を計算（daily_limit * 30）
*/

-- ============================================
-- 1. monthly_allocationカラムを追加
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_usage_settings' AND column_name = 'monthly_allocation'
  ) THEN
    ALTER TABLE ai_usage_settings
    ADD COLUMN monthly_allocation integer NOT NULL DEFAULT 100;
  END IF;
END $$;

-- ============================================
-- 2. 既存データの更新
-- ============================================

UPDATE ai_usage_settings
SET monthly_allocation = CASE
  WHEN daily_limit = -1 THEN 999999  -- 無制限の場合は大きな値
  WHEN daily_limit > 0 THEN daily_limit * 30  -- 日次を月次に変換
  ELSE 100  -- デフォルト
END
WHERE monthly_allocation = 100;  -- デフォルト値のもののみ更新
