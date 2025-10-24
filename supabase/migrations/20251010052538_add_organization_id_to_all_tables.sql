/*
  # 既存テーブルへの organization_id 追加（修正版）

  ## 概要
  マルチテナント化のため、全ての既存テーブルに organization_id カラムを追加します。

  ## 変更対象テーブル
    1. `profiles` - ユーザープロファイル
    2. `stores` - 店舗情報
    3. `store_assignments` - 店舗割り当て
    4. `vendors` - 仕入先
    5. `store_vendor_assignments` - 店舗-仕入先割り当て
    6. `daily_reports` - 日報
    7. `daily_report_vendor_purchases` - 日報仕入明細
    8. `monthly_expenses` - 月次経費
    9. `targets` - 目標
    10. `daily_targets` - 日別目標
    11. `expense_baselines` - 参考経費
    12. `ai_conversations` - AI会話
    13. `ai_messages` - AIメッセージ
    14. `ai_generated_reports` - AI生成レポート
    15. `report_schedules` - レポートスケジュール
    16. `ai_usage_settings` - AI使用設定
    17. `ai_usage_tracking` - AI使用追跡
    18. `report_generation_logs` - レポート生成ログ
    19. `summary_data` - サマリーデータ
*/

-- ============================================
-- 1. profiles テーブル
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_profiles_organization
      ON public.profiles (organization_id);
    
    RAISE NOTICE '✅ profiles に organization_id を追加';
  END IF;
END $$;

-- ============================================
-- 2. stores テーブル
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stores'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.stores
    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_stores_organization
      ON public.stores (organization_id);
    
    RAISE NOTICE '✅ stores に organization_id を追加';
  END IF;
END $$;

-- ============================================
-- 3. store_assignments テーブル
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'store_assignments'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.store_assignments
    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_store_assignments_organization
      ON public.store_assignments (organization_id);
    
    RAISE NOTICE '✅ store_assignments に organization_id を追加';
  END IF;
END $$;

-- ============================================
-- 4. vendors テーブル
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vendors'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.vendors
    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_vendors_organization
      ON public.vendors (organization_id);
    
    RAISE NOTICE '✅ vendors に organization_id を追加';
  END IF;
END $$;

-- ============================================
-- 5. store_vendor_assignments テーブル
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'store_vendor_assignments'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.store_vendor_assignments
    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_store_vendor_assignments_organization
      ON public.store_vendor_assignments (organization_id);
    
    RAISE NOTICE '✅ store_vendor_assignments に organization_id を追加';
  END IF;
END $$;

-- ============================================
-- 6. daily_reports テーブル
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_reports'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.daily_reports
    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_daily_reports_organization
      ON public.daily_reports (organization_id, date DESC);
    
    RAISE NOTICE '✅ daily_reports に organization_id を追加';
  END IF;
END $$;

-- ============================================
-- 7. daily_report_vendor_purchases テーブル
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_report_vendor_purchases'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.daily_report_vendor_purchases
    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_daily_report_vendor_purchases_organization
      ON public.daily_report_vendor_purchases (organization_id);
    
    RAISE NOTICE '✅ daily_report_vendor_purchases に organization_id を追加';
  END IF;
END $$;

-- ============================================
-- 8. monthly_expenses テーブル
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'monthly_expenses'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.monthly_expenses
    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_monthly_expenses_organization
      ON public.monthly_expenses (organization_id, month);
    
    RAISE NOTICE '✅ monthly_expenses に organization_id を追加';
  END IF;
END $$;

-- ============================================
-- 9. targets テーブル
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'targets'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.targets
    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_targets_organization
      ON public.targets (organization_id);
    
    RAISE NOTICE '✅ targets に organization_id を追加';
  END IF;
END $$;

-- ============================================
-- 10. daily_targets テーブル
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_targets'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.daily_targets
    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_daily_targets_organization
      ON public.daily_targets (organization_id, date DESC);
    
    RAISE NOTICE '✅ daily_targets に organization_id を追加';
  END IF;
END $$;

-- ============================================
-- 11. expense_baselines テーブル
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'expense_baselines'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.expense_baselines
    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_expense_baselines_organization
      ON public.expense_baselines (organization_id);
    
    RAISE NOTICE '✅ expense_baselines に organization_id を追加';
  END IF;
END $$;

-- ============================================
-- 12. ai_conversations テーブル
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_conversations'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.ai_conversations
    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_ai_conversations_organization
      ON public.ai_conversations (organization_id);
    
    RAISE NOTICE '✅ ai_conversations に organization_id を追加';
  END IF;
END $$;

-- ============================================
-- 13. ai_messages テーブル
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_messages'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.ai_messages
    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_ai_messages_organization
      ON public.ai_messages (organization_id);
    
    RAISE NOTICE '✅ ai_messages に organization_id を追加';
  END IF;
END $$;

-- ============================================
-- 14. ai_generated_reports テーブル
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_generated_reports'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.ai_generated_reports
    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_ai_generated_reports_organization
      ON public.ai_generated_reports (organization_id);
    
    RAISE NOTICE '✅ ai_generated_reports に organization_id を追加';
  END IF;
END $$;

-- ============================================
-- 15. report_schedules テーブル
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'report_schedules'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.report_schedules
    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_report_schedules_organization
      ON public.report_schedules (organization_id);
    
    RAISE NOTICE '✅ report_schedules に organization_id を追加';
  END IF;
END $$;

-- ============================================
-- 16. ai_usage_settings テーブル
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_usage_settings'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.ai_usage_settings
    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_ai_usage_settings_organization
      ON public.ai_usage_settings (organization_id);
    
    RAISE NOTICE '✅ ai_usage_settings に organization_id を追加';
  END IF;
END $$;

-- ============================================
-- 17. ai_usage_tracking テーブル
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_usage_tracking'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.ai_usage_tracking
    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_organization
      ON public.ai_usage_tracking (organization_id);
    
    RAISE NOTICE '✅ ai_usage_tracking に organization_id を追加';
  END IF;
END $$;

-- ============================================
-- 18. report_generation_logs テーブル
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'report_generation_logs'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.report_generation_logs
    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_report_generation_logs_organization
      ON public.report_generation_logs (organization_id);
    
    RAISE NOTICE '✅ report_generation_logs に organization_id を追加';
  END IF;
END $$;

-- ============================================
-- 19. summary_data テーブル
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'summary_data'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.summary_data
    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_summary_data_organization
      ON public.summary_data (organization_id);
    
    RAISE NOTICE '✅ summary_data に organization_id を追加';
  END IF;
END $$;

-- ============================================
-- 確認メッセージ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 全19テーブルへの organization_id 追加完了';
  RAISE NOTICE '========================================';
END $$;
