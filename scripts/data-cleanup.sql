/*
  データクリーンアップスクリプト

  このスクリプトは、開発環境やテスト環境のデータをクリーンアップするためのものです。
  本番環境では使用しないでください。

  使用方法:
  1. 必要な関数を選んで実行
  2. 慎重に確認してから実行
  3. バックアップを取ってから実行することを推奨
*/

-- ============================================
-- 1. 特定組織の全データを削除
-- ============================================

CREATE OR REPLACE FUNCTION delete_organization_data(org_id uuid)
RETURNS TABLE (
  deleted_stores integer,
  deleted_reports integer,
  deleted_members integer,
  deleted_organization boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  store_count integer;
  report_count integer;
  member_count integer;
BEGIN
  -- 店舗数をカウント
  SELECT count(*) INTO store_count
  FROM stores
  WHERE organization_id = org_id;

  -- レポート数をカウント
  SELECT count(*) INTO report_count
  FROM daily_reports
  WHERE organization_id = org_id;

  -- メンバー数をカウント
  SELECT count(*) INTO member_count
  FROM organization_members
  WHERE organization_id = org_id;

  -- データ削除（CASCADE により関連データも削除される）
  DELETE FROM organizations WHERE id = org_id;

  RETURN QUERY SELECT store_count, report_count, member_count, true;
END;
$$;

COMMENT ON FUNCTION delete_organization_data(uuid) IS '指定された組織とその関連データをすべて削除する（本番環境では使用しないこと）';

-- 使用例:
-- SELECT * FROM delete_organization_data('組織のUUID');

-- ============================================
-- 2. テスト組織を一括削除
-- ============================================

CREATE OR REPLACE FUNCTION delete_test_organizations()
RETURNS TABLE (
  deleted_count integer,
  org_names text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_orgs uuid[];
  org_name_list text[];
  deleted integer;
BEGIN
  -- テスト組織を識別（名前に「テスト」「test」を含む、またはis_demo=true）
  SELECT array_agg(id), array_agg(name)
  INTO test_orgs, org_name_list
  FROM organizations
  WHERE
    is_demo = true
    OR name ILIKE '%テスト%'
    OR name ILIKE '%test%'
    OR name ILIKE '%開発%'
    OR name ILIKE '%dev%'
    OR slug LIKE 'test-%';

  -- 組織を削除
  DELETE FROM organizations
  WHERE id = ANY(test_orgs);

  GET DIAGNOSTICS deleted = ROW_COUNT;

  RETURN QUERY SELECT deleted, COALESCE(org_name_list, ARRAY[]::text[]);
END;
$$;

COMMENT ON FUNCTION delete_test_organizations() IS 'テスト用組織を一括削除する';

-- 使用例:
-- SELECT * FROM delete_test_organizations();

-- ============================================
-- 3. 期限切れデモ組織を削除（既存の関数を活用）
-- ============================================

-- 既存のpurge_expired_demos()関数を使用
-- 7日間猶予後に自動削除される

-- 手動実行:
-- SELECT * FROM purge_expired_demos();

-- ============================================
-- 4. 古いデータのアーカイブ・削除
-- ============================================

CREATE OR REPLACE FUNCTION archive_old_reports(
  days_old integer DEFAULT 365,
  org_id uuid DEFAULT NULL
)
RETURNS TABLE (
  archived_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff_date date;
  deleted integer;
BEGIN
  cutoff_date := CURRENT_DATE - days_old;

  -- 古いレポートを削除（または別テーブルに移動）
  DELETE FROM daily_reports
  WHERE date < cutoff_date
    AND (org_id IS NULL OR organization_id = org_id);

  GET DIAGNOSTICS deleted = ROW_COUNT;

  RETURN QUERY SELECT deleted;
END;
$$;

COMMENT ON FUNCTION archive_old_reports(integer, uuid) IS '指定日数より古いレポートを削除する';

-- 使用例:
-- 1年以上古いレポートを削除
-- SELECT * FROM archive_old_reports(365);

-- 特定組織の古いレポートを削除
-- SELECT * FROM archive_old_reports(365, '組織のUUID');

-- ============================================
-- 5. 未使用データのクリーンアップ
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_unused_data()
RETURNS TABLE (
  deleted_vendors integer,
  deleted_targets integer,
  deleted_baselines integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  vendor_count integer;
  target_count integer;
  baseline_count integer;
BEGIN
  -- 使用されていないベンダーを削除
  DELETE FROM vendors
  WHERE id NOT IN (
    SELECT DISTINCT vendor_id
    FROM store_vendor_assignments
    WHERE vendor_id IS NOT NULL
  );
  GET DIAGNOSTICS vendor_count = ROW_COUNT;

  -- 店舗が存在しないターゲットを削除
  DELETE FROM targets
  WHERE store_id NOT IN (
    SELECT id FROM stores WHERE is_active = true
  );
  GET DIAGNOSTICS target_count = ROW_COUNT;

  -- 店舗が存在しない経費基準を削除
  DELETE FROM expense_baselines
  WHERE store_id NOT IN (
    SELECT id FROM stores WHERE is_active = true
  );
  GET DIAGNOSTICS baseline_count = ROW_COUNT;

  RETURN QUERY SELECT vendor_count, target_count, baseline_count;
END;
$$;

COMMENT ON FUNCTION cleanup_unused_data() IS '未使用のベンダー、ターゲット、経費基準を削除する';

-- 使用例:
-- SELECT * FROM cleanup_unused_data();

-- ============================================
-- 6. 開発データの識別
-- ============================================

CREATE OR REPLACE FUNCTION identify_dev_organizations()
RETURNS TABLE (
  org_id uuid,
  org_name text,
  org_slug text,
  created_at timestamptz,
  store_count bigint,
  report_count bigint,
  member_count bigint,
  is_demo boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.slug,
    o.created_at,
    COALESCE(s.store_count, 0),
    COALESCE(r.report_count, 0),
    COALESCE(m.member_count, 0),
    o.is_demo
  FROM organizations o
  LEFT JOIN (
    SELECT organization_id, count(*) as store_count
    FROM stores
    GROUP BY organization_id
  ) s ON s.organization_id = o.id
  LEFT JOIN (
    SELECT organization_id, count(*) as report_count
    FROM daily_reports
    GROUP BY organization_id
  ) r ON r.organization_id = o.id
  LEFT JOIN (
    SELECT organization_id, count(*) as member_count
    FROM organization_members
    GROUP BY organization_id
  ) m ON m.organization_id = o.id
  WHERE
    o.is_demo = true
    OR o.name ILIKE '%テスト%'
    OR o.name ILIKE '%test%'
    OR o.name ILIKE '%開発%'
    OR o.name ILIKE '%dev%'
    OR o.slug LIKE 'test-%'
  ORDER BY o.created_at DESC;
END;
$$;

COMMENT ON FUNCTION identify_dev_organizations() IS '開発・テスト用と思われる組織を識別する';

-- 使用例:
-- SELECT * FROM identify_dev_organizations();

-- ============================================
-- 7. 組織データの統計情報
-- ============================================

CREATE OR REPLACE FUNCTION get_organization_stats(org_id uuid)
RETURNS TABLE (
  organization_name text,
  total_stores integer,
  active_stores integer,
  total_reports integer,
  latest_report_date date,
  total_members integer,
  subscription_status text,
  subscription_plan text,
  ai_usage_this_month bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.name,
    (SELECT count(*)::integer FROM stores WHERE organization_id = org_id),
    (SELECT count(*)::integer FROM stores WHERE organization_id = org_id AND is_active = true),
    (SELECT count(*)::integer FROM daily_reports WHERE organization_id = org_id),
    (SELECT max(date) FROM daily_reports WHERE organization_id = org_id),
    (SELECT count(*)::integer FROM organization_members WHERE organization_id = org_id),
    o.subscription_status,
    o.subscription_plan,
    COALESCE((
      SELECT sum(amount)
      FROM usage_counters
      WHERE organization_id = org_id
        AND kind = 'ai_calls'
        AND period_start >= date_trunc('month', CURRENT_DATE)::date
    ), 0)
  FROM organizations o
  WHERE o.id = org_id;
END;
$$;

COMMENT ON FUNCTION get_organization_stats(uuid) IS '組織のデータ統計情報を取得する';

-- 使用例:
-- SELECT * FROM get_organization_stats('組織のUUID');

-- ============================================
-- 8. 全組織の概要を取得
-- ============================================

CREATE OR REPLACE FUNCTION get_all_organizations_summary()
RETURNS TABLE (
  org_id uuid,
  org_name text,
  org_slug text,
  is_demo boolean,
  subscription_status text,
  subscription_plan text,
  store_count bigint,
  report_count bigint,
  member_count bigint,
  created_at timestamptz,
  last_activity timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.slug,
    o.is_demo,
    o.subscription_status,
    o.subscription_plan,
    COALESCE(s.store_count, 0),
    COALESCE(r.report_count, 0),
    COALESCE(m.member_count, 0),
    o.created_at,
    COALESCE(r.last_report, o.created_at)
  FROM organizations o
  LEFT JOIN (
    SELECT organization_id, count(*) as store_count
    FROM stores
    GROUP BY organization_id
  ) s ON s.organization_id = o.id
  LEFT JOIN (
    SELECT organization_id, count(*) as report_count, max(created_at) as last_report
    FROM daily_reports
    GROUP BY organization_id
  ) r ON r.organization_id = o.id
  LEFT JOIN (
    SELECT organization_id, count(*) as member_count
    FROM organization_members
    GROUP BY organization_id
  ) m ON m.organization_id = o.id
  ORDER BY o.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_all_organizations_summary() IS 'すべての組織の概要を取得する（スーパー管理者用）';

-- 使用例:
-- SELECT * FROM get_all_organizations_summary();

-- ============================================
-- 9. データ整合性チェック
-- ============================================

CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE (
  check_name text,
  issue_count bigint,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 組織に紐づかないレポートをチェック
  RETURN QUERY
  SELECT
    'レポートに組織IDがない'::text,
    count(*),
    'daily_reports'::text
  FROM daily_reports
  WHERE organization_id IS NULL;

  -- 組織に紐づかない店舗をチェック
  RETURN QUERY
  SELECT
    '店舗に組織IDがない'::text,
    count(*),
    'stores'::text
  FROM stores
  WHERE organization_id IS NULL;

  -- プロファイルに組織がないユーザーをチェック
  RETURN QUERY
  SELECT
    'プロファイルに組織IDがない'::text,
    count(*),
    'profiles'::text
  FROM profiles
  WHERE organization_id IS NULL;

  -- 組織メンバーシップがないユーザーをチェック
  RETURN QUERY
  SELECT
    '組織メンバーシップがないプロファイル'::text,
    count(*),
    'profiles without organization_members'::text
  FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = p.id
  );

  -- 存在しない店舗を参照しているレポートをチェック
  RETURN QUERY
  SELECT
    '存在しない店舗を参照するレポート'::text,
    count(*),
    'daily_reports'::text
  FROM daily_reports dr
  WHERE NOT EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = dr.store_id
  );
END;
$$;

COMMENT ON FUNCTION check_data_integrity() IS 'データの整合性をチェックする';

-- 使用例:
-- SELECT * FROM check_data_integrity();

-- ============================================
-- 使用上の注意
-- ============================================

/*
⚠️ 警告：これらの関数は強力なデータ削除機能を持っています

1. 本番環境では使用しないでください
2. 実行前に必ずバックアップを取ってください
3. まずidentify_dev_organizations()で対象を確認してください
4. 少数の組織で試してから大量削除を行ってください
5. トランザクション内で実行し、問題があればROLLBACKしてください

トランザクション例:
BEGIN;
  SELECT * FROM delete_test_organizations();
  -- 結果を確認
  -- 問題なければCOMMIT、問題があればROLLBACK
ROLLBACK; -- または COMMIT;
*/

-- ============================================
-- クリーンアップ完了メッセージ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ データクリーンアップ関数を作成しました';
  RAISE NOTICE '========================================';
  RAISE NOTICE '利用可能な関数:';
  RAISE NOTICE '  1. delete_organization_data(org_id) - 特定組織を削除';
  RAISE NOTICE '  2. delete_test_organizations() - テスト組織を一括削除';
  RAISE NOTICE '  3. purge_expired_demos() - 期限切れデモを削除';
  RAISE NOTICE '  4. archive_old_reports(days, org_id) - 古いレポートを削除';
  RAISE NOTICE '  5. cleanup_unused_data() - 未使用データを削除';
  RAISE NOTICE '  6. identify_dev_organizations() - 開発組織を識別';
  RAISE NOTICE '  7. get_organization_stats(org_id) - 組織統計';
  RAISE NOTICE '  8. get_all_organizations_summary() - 全組織概要';
  RAISE NOTICE '  9. check_data_integrity() - データ整合性チェック';
  RAISE NOTICE '========================================';
  RAISE NOTICE '⚠️  注意: 実行前に必ずバックアップを取ってください';
  RAISE NOTICE '========================================';
END $$;
