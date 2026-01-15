/*
  # 本番環境用 RLS ポリシー完全強化 v2

  ## 概要
  全テーブルでRow Level Security（RLS）を強制し、
  本番運用に必要な厳格なアクセス制御を実装します。

  ## 修正内容
  - summary_dataのstore_id型エラーを修正
  - 全テーブルのRLS強化
*/

-- ============================================
-- 1. targets テーブルのRLS強化
-- ============================================

DROP POLICY IF EXISTS "Users can view targets for assigned stores" ON targets;
DROP POLICY IF EXISTS "Managers and admins can create targets" ON targets;
DROP POLICY IF EXISTS "Managers and admins can update targets" ON targets;
DROP POLICY IF EXISTS "Admins can delete targets" ON targets;

CREATE POLICY "Users can view targets for assigned stores"
ON targets FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM store_assignments sa
    WHERE sa.user_id = auth.uid()
      AND sa.store_id = targets.store_id
  )
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "Managers and admins can create targets"
ON targets FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'admin')
  )
  AND (
    EXISTS (
      SELECT 1 FROM store_assignments sa
      WHERE sa.user_id = auth.uid()
        AND sa.store_id = targets.store_id
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
);

CREATE POLICY "Managers and admins can update targets"
ON targets FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'admin')
  )
  AND (
    EXISTS (
      SELECT 1 FROM store_assignments sa
      WHERE sa.user_id = auth.uid()
        AND sa.store_id = targets.store_id
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'admin')
  )
);

CREATE POLICY "Admins can delete targets"
ON targets FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- ============================================
-- 2. summary_data テーブルのRLS強化
-- ============================================

ALTER TABLE summary_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view summary for assigned stores" ON summary_data;

CREATE POLICY "Users can view summary for assigned stores"
ON summary_data FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM store_assignments sa
    WHERE sa.user_id = auth.uid()
      AND (sa.store_id = summary_data.store_id OR summary_data.store_id IS NULL)
  )
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- ============================================
-- 3. daily_report_vendor_purchases の強化
-- ============================================

ALTER TABLE daily_report_vendor_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view vendor purchases for accessible reports" ON daily_report_vendor_purchases;
DROP POLICY IF EXISTS "Users can insert vendor purchases for own reports" ON daily_report_vendor_purchases;
DROP POLICY IF EXISTS "Users can update own vendor purchases" ON daily_report_vendor_purchases;
DROP POLICY IF EXISTS "Users can delete own vendor purchases" ON daily_report_vendor_purchases;

CREATE POLICY "Users can view vendor purchases for accessible reports"
ON daily_report_vendor_purchases FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM daily_reports dr
    JOIN store_assignments sa ON sa.store_id = dr.store_id
    WHERE dr.id = daily_report_vendor_purchases.daily_report_id
      AND sa.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "Users can insert vendor purchases for own reports"
ON daily_report_vendor_purchases FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM daily_reports dr
    WHERE dr.id = daily_report_vendor_purchases.daily_report_id
      AND dr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own vendor purchases"
ON daily_report_vendor_purchases FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM daily_reports dr
    WHERE dr.id = daily_report_vendor_purchases.daily_report_id
      AND dr.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM daily_reports dr
    WHERE dr.id = daily_report_vendor_purchases.daily_report_id
      AND dr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own vendor purchases"
ON daily_report_vendor_purchases FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM daily_reports dr
    WHERE dr.id = daily_report_vendor_purchases.daily_report_id
      AND dr.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- ============================================
-- 4. RLS 状態確認ビュー
-- ============================================

CREATE OR REPLACE VIEW rls_status AS
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '⚠️ DISABLED' END AS status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

CREATE OR REPLACE VIEW rls_policies AS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

COMMENT ON VIEW rls_status IS
'全テーブルのRLS有効化状態を確認するビュー。
使用例: SELECT * FROM rls_status WHERE rls_enabled = false;';

COMMENT ON VIEW rls_policies IS
'全テーブルのRLSポリシー一覧。
使用例: SELECT * FROM rls_policies WHERE tablename = ''daily_reports'';';

-- ============================================
-- 5. 本番環境チェックリスト
-- ============================================

DO $$
DECLARE
  disabled_tables TEXT;
BEGIN
  SELECT string_agg(tablename, ', ')
  INTO disabled_tables
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = false;

  IF disabled_tables IS NOT NULL THEN
    RAISE WARNING '⚠️ 以下のテーブルでRLSが無効です: %', disabled_tables;
  ELSE
    RAISE NOTICE '✅ 全テーブルでRLSが有効化されています';
  END IF;
END $$;
