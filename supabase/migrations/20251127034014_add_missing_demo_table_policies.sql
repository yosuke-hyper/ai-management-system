/*
  # Add missing RLS policies for demo tables

  ## 概要
  RLSが有効だがポリシーが存在しないdemoテーブルにポリシーを追加します。

  ## 変更内容
  - demo_ai_usage_tracking: 公開アクセスポリシーを追加
  - demo_monthly_expenses: 公開アクセスポリシーを追加

  ## セキュリティ
  これらはデモ用テーブルなので、公開アクセスを許可します。
*/

-- ============================================================================
-- demo_ai_usage_tracking
-- ============================================================================

-- Check if policies exist, if not create them
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'demo_ai_usage_tracking' 
    AND policyname = 'Public full access to demo AI usage tracking'
  ) THEN
    CREATE POLICY "Public full access to demo AI usage tracking"
      ON demo_ai_usage_tracking
      FOR ALL
      TO public
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- demo_monthly_expenses
-- ============================================================================

-- Check if policies exist, if not create them
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'demo_monthly_expenses' 
    AND policyname = 'Public full access to demo monthly expenses'
  ) THEN
    CREATE POLICY "Public full access to demo monthly expenses"
      ON demo_monthly_expenses
      FOR ALL
      TO public
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
