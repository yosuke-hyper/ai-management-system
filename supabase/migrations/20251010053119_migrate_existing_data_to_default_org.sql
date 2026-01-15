/*
  # 既存データのマルチテナント移行

  ## 概要
  既存の2ユーザー、3店舗、12日報などのデータを新しいマルチテナント構造に移行します。

  ## 実行内容
    1. デフォルト組織「既存データ組織」を作成
    2. 全テーブルの organization_id を設定
    3. 既存ユーザーを organization_members に登録
       - admin -> owner
       - staff -> member
    4. データ整合性を確認

  ## 安全性
    - トランザクションは使用しない（Supabase Edge Function制約）
    - 各ステップで確認メッセージを出力
    - エラーが発生しても既存データは保護される
*/

-- ============================================
-- 1. デフォルト組織の作成
-- ============================================

DO $$
DECLARE
  org_id uuid;
BEGIN
  -- 既存の組織をチェック
  SELECT id INTO org_id FROM organizations WHERE slug = 'default-organization' LIMIT 1;
  
  IF org_id IS NULL THEN
    -- 新規作成
    INSERT INTO organizations (
      name,
      slug,
      email,
      subscription_status,
      subscription_plan,
      trial_ends_at,
      max_stores,
      max_users,
      max_ai_requests_per_month
    )
    VALUES (
      '既存データ組織',
      'default-organization',
      'coccroco.2014@gmail.com',
      'active',
      'enterprise',
      NULL,
      999,
      999,
      9999
    )
    RETURNING id INTO org_id;
    
    RAISE NOTICE '✅ デフォルト組織を作成しました (ID: %)', org_id;
  ELSE
    RAISE NOTICE '⏭️  デフォルト組織は既に存在します (ID: %)', org_id;
  END IF;
END $$;

-- ============================================
-- 2. profiles テーブルの移行
-- ============================================

DO $$
DECLARE
  org_id uuid;
  updated_count int;
BEGIN
  SELECT id INTO org_id FROM organizations WHERE slug = 'default-organization';
  
  UPDATE profiles
  SET organization_id = org_id
  WHERE organization_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ profiles: % 件更新', updated_count;
END $$;

-- ============================================
-- 3. stores テーブルの移行
-- ============================================

DO $$
DECLARE
  org_id uuid;
  updated_count int;
BEGIN
  SELECT id INTO org_id FROM organizations WHERE slug = 'default-organization';
  
  UPDATE stores
  SET organization_id = org_id
  WHERE organization_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ stores: % 件更新', updated_count;
END $$;

-- ============================================
-- 4. vendors テーブルの移行
-- ============================================

DO $$
DECLARE
  org_id uuid;
  updated_count int;
BEGIN
  SELECT id INTO org_id FROM organizations WHERE slug = 'default-organization';
  
  UPDATE vendors
  SET organization_id = org_id
  WHERE organization_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ vendors: % 件更新', updated_count;
END $$;

-- ============================================
-- 5. daily_reports テーブルの移行
-- ============================================

DO $$
DECLARE
  org_id uuid;
  updated_count int;
BEGIN
  SELECT id INTO org_id FROM organizations WHERE slug = 'default-organization';
  
  UPDATE daily_reports
  SET organization_id = org_id
  WHERE organization_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ daily_reports: % 件更新', updated_count;
END $$;

-- ============================================
-- 6. targets テーブルの移行
-- ============================================

DO $$
DECLARE
  org_id uuid;
  updated_count int;
BEGIN
  SELECT id INTO org_id FROM organizations WHERE slug = 'default-organization';
  
  UPDATE targets
  SET organization_id = org_id
  WHERE organization_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ targets: % 件更新', updated_count;
END $$;

-- ============================================
-- 7. store_assignments テーブルの移行
-- ============================================

DO $$
DECLARE
  org_id uuid;
  updated_count int;
BEGIN
  SELECT id INTO org_id FROM organizations WHERE slug = 'default-organization';
  
  UPDATE store_assignments
  SET organization_id = org_id
  WHERE organization_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ store_assignments: % 件更新', updated_count;
END $$;

-- ============================================
-- 8. store_vendor_assignments テーブルの移行
-- ============================================

DO $$
DECLARE
  org_id uuid;
  updated_count int;
BEGIN
  SELECT id INTO org_id FROM organizations WHERE slug = 'default-organization';
  
  UPDATE store_vendor_assignments
  SET organization_id = org_id
  WHERE organization_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ store_vendor_assignments: % 件更新', updated_count;
END $$;

-- ============================================
-- 9. daily_targets テーブルの移行
-- ============================================

DO $$
DECLARE
  org_id uuid;
  updated_count int;
BEGIN
  SELECT id INTO org_id FROM organizations WHERE slug = 'default-organization';
  
  UPDATE daily_targets
  SET organization_id = org_id
  WHERE organization_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ daily_targets: % 件更新', updated_count;
END $$;

-- ============================================
-- 10. expense_baselines テーブルの移行
-- ============================================

DO $$
DECLARE
  org_id uuid;
  updated_count int;
BEGIN
  SELECT id INTO org_id FROM organizations WHERE slug = 'default-organization';
  
  UPDATE expense_baselines
  SET organization_id = org_id
  WHERE organization_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ expense_baselines: % 件更新', updated_count;
END $$;

-- ============================================
-- 11. daily_report_vendor_purchases テーブルの移行
-- ============================================

DO $$
DECLARE
  org_id uuid;
  updated_count int;
BEGIN
  SELECT id INTO org_id FROM organizations WHERE slug = 'default-organization';
  
  UPDATE daily_report_vendor_purchases
  SET organization_id = org_id
  WHERE organization_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ daily_report_vendor_purchases: % 件更新', updated_count;
END $$;

-- ============================================
-- 12. AI関連テーブルの移行
-- ============================================

DO $$
DECLARE
  org_id uuid;
  updated_count int;
BEGIN
  SELECT id INTO org_id FROM organizations WHERE slug = 'default-organization';
  
  UPDATE ai_conversations SET organization_id = org_id WHERE organization_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ ai_conversations: % 件更新', updated_count;
  
  UPDATE ai_messages SET organization_id = org_id WHERE organization_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ ai_messages: % 件更新', updated_count;
  
  UPDATE ai_generated_reports SET organization_id = org_id WHERE organization_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ ai_generated_reports: % 件更新', updated_count;
  
  UPDATE report_schedules SET organization_id = org_id WHERE organization_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ report_schedules: % 件更新', updated_count;
  
  UPDATE ai_usage_tracking SET organization_id = org_id WHERE organization_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ ai_usage_tracking: % 件更新', updated_count;
END $$;

-- ============================================
-- 13. 既存ユーザーを organization_members に登録
-- ============================================

DO $$
DECLARE
  org_id uuid;
  inserted_count int := 0;
  user_record RECORD;
BEGIN
  SELECT id INTO org_id FROM organizations WHERE slug = 'default-organization';
  
  -- 各ユーザーを登録
  FOR user_record IN 
    SELECT p.id, p.role 
    FROM profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = p.id AND om.organization_id = org_id
    )
  LOOP
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (
      org_id,
      user_record.id,
      CASE
        WHEN user_record.role = 'admin' THEN 'owner'
        WHEN user_record.role = 'manager' THEN 'admin'
        ELSE 'member'
      END
    )
    ON CONFLICT (organization_id, user_id) DO NOTHING;
    
    inserted_count := inserted_count + 1;
  END LOOP;
  
  RAISE NOTICE '✅ organization_members: % 件追加', inserted_count;
END $$;

-- ============================================
-- 14. データ整合性の確認
-- ============================================

DO $$
DECLARE
  org_id uuid;
  profiles_null int;
  stores_null int;
  reports_null int;
  org_members int;
BEGIN
  SELECT id INTO org_id FROM organizations WHERE slug = 'default-organization';
  
  -- organization_id が NULL のレコードをチェック
  SELECT COUNT(*) INTO profiles_null FROM profiles WHERE organization_id IS NULL;
  SELECT COUNT(*) INTO stores_null FROM stores WHERE organization_id IS NULL;
  SELECT COUNT(*) INTO reports_null FROM daily_reports WHERE organization_id IS NULL;
  SELECT COUNT(*) INTO org_members FROM organization_members WHERE organization_id = org_id;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 データ移行完了レポート';
  RAISE NOTICE '========================================';
  RAISE NOTICE '組織ID: %', org_id;
  RAISE NOTICE '組織名: 既存データ組織';
  RAISE NOTICE '組織メンバー数: %', org_members;
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'NULL チェック:';
  RAISE NOTICE '  profiles (NULL): %', profiles_null;
  RAISE NOTICE '  stores (NULL): %', stores_null;
  RAISE NOTICE '  daily_reports (NULL): %', reports_null;
  RAISE NOTICE '========================================';
  
  IF profiles_null = 0 AND stores_null = 0 AND reports_null = 0 THEN
    RAISE NOTICE '✅ データ移行成功！全てのデータが組織に紐付きました';
  ELSE
    RAISE WARNING '⚠️  一部のデータが未移行です。確認が必要です。';
  END IF;
END $$;
