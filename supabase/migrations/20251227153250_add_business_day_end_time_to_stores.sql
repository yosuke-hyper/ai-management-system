/*
  # 営業日終了時刻の追加

  1. 変更内容
    - `stores` テーブルに `business_day_end_time` カラムを追加
    - デフォルト値: 00:00（深夜0時 = 日付区切り）
    - 深夜営業店舗は 05:00 などに設定可能

  2. 目的
    - 深夜営業店舗の日次レポートが正しく日付に紐付くようにする
    - 例: business_day_end_time = '05:00' の場合、
          2025-12-27 02:00 の売上は 2025-12-26 の営業日として記録

  3. セキュリティ
    - 既存のRLSポリシーで保護される
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' 
    AND column_name = 'business_day_end_time'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE stores 
    ADD COLUMN business_day_end_time TIME DEFAULT '00:00:00';
    
    COMMENT ON COLUMN stores.business_day_end_time IS 
      '営業日終了時刻。深夜0時以降も営業する店舗は05:00などに設定。この時刻までの売上は前日の営業日として計算される。';
  END IF;
END $$;

-- demo_storesにも追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'demo_stores' 
    AND column_name = 'business_day_end_time'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE demo_stores 
    ADD COLUMN business_day_end_time TIME DEFAULT '00:00:00';
  END IF;
END $$;

-- fixed_demo_storesにも追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixed_demo_stores' 
    AND column_name = 'business_day_end_time'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE fixed_demo_stores 
    ADD COLUMN business_day_end_time TIME DEFAULT '00:00:00';
  END IF;
END $$;
