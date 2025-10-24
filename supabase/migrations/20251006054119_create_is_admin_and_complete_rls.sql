/*
  # is_admin()関数 + 完全なRLSポリシー + パフォーマンスインデックス

  ## 概要
  1. is_admin()ヘルパー関数を作成
  2. UPDATE/INSERTのWITH CHECKを追加
  3. パフォーマンス用インデックスを作成

  ## 重要
  データ整合性とパフォーマンスを同時に改善します
*/

-- ============================================
-- 1. is_admin() ヘルパー関数
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
'現在のユーザーが管理者かどうかを判定する関数。
RLSポリシー内で使用します。';

-- ============================================
-- 2. daily_reports のポリシー修正
-- ============================================

DROP POLICY IF EXISTS "dr_update" ON daily_reports;
CREATE POLICY "dr_update" ON daily_reports
FOR UPDATE
TO authenticated
USING (
  is_admin() OR daily_reports.user_id = auth.uid()
)
WITH CHECK (
  is_admin() OR EXISTS (
    SELECT 1 FROM store_assignments sa
    WHERE sa.store_id = daily_reports.store_id
      AND sa.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "dr_insert" ON daily_reports;
CREATE POLICY "dr_insert" ON daily_reports
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin() OR EXISTS (
    SELECT 1 FROM store_assignments sa
    WHERE sa.store_id = daily_reports.store_id
      AND sa.user_id = auth.uid()
  )
);

-- ============================================
-- 3. targets のポリシー修正
-- ============================================

DROP POLICY IF EXISTS "Managers and admins can create targets" ON targets;
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
    OR is_admin()
  )
);

DROP POLICY IF EXISTS "Managers and admins can update targets" ON targets;
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
    OR is_admin()
  )
)
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
    OR is_admin()
  )
);

-- ============================================
-- 4. monthly_expenses のポリシー修正
-- ============================================

DROP POLICY IF EXISTS "me_select" ON monthly_expenses;
DROP POLICY IF EXISTS "me_modify" ON monthly_expenses;

CREATE POLICY "me_select" ON monthly_expenses
FOR SELECT
TO authenticated
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM store_assignments sa
    WHERE sa.store_id = monthly_expenses.store_id
      AND sa.user_id = auth.uid()
  )
);

CREATE POLICY "me_insert" ON monthly_expenses
FOR INSERT
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
        AND sa.store_id = monthly_expenses.store_id
    )
    OR is_admin()
  )
);

CREATE POLICY "me_update" ON monthly_expenses
FOR UPDATE
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
        AND sa.store_id = monthly_expenses.store_id
    )
    OR is_admin()
  )
)
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
        AND sa.store_id = monthly_expenses.store_id
    )
    OR is_admin()
  )
);

CREATE POLICY "me_delete" ON monthly_expenses
FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- 5. パフォーマンス用インデックス
-- ============================================

CREATE INDEX IF NOT EXISTS idx_daily_reports_store_date
  ON daily_reports (store_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_reports_user_date
  ON daily_reports (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_monthly_expenses_store_month
  ON monthly_expenses (store_id, month);

CREATE INDEX IF NOT EXISTS idx_targets_store_period
  ON targets (store_id, period);

CREATE INDEX IF NOT EXISTS idx_store_assignments_user
  ON store_assignments (user_id);

CREATE INDEX IF NOT EXISTS idx_store_assignments_store
  ON store_assignments (store_id);

CREATE INDEX IF NOT EXISTS idx_drv_purchases_report
  ON daily_report_vendor_purchases (daily_report_id);

-- ============================================
-- 6. ユニーク制約インデックス
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS uniq_store_assignment
  ON store_assignments (user_id, store_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_store_vendor
  ON store_vendor_assignments (store_id, vendor_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_profiles_email
  ON profiles (email);

-- ============================================
-- 7. 確認メッセージ
-- ============================================

DO $$
DECLARE
  index_count INTEGER;
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  RAISE NOTICE '✅ is_admin()関数作成完了';
  RAISE NOTICE '✅ RLSポリシー（WITH CHECK）追加完了';
  RAISE NOTICE '✅ パフォーマンス用インデックス作成完了: % 個', index_count;
  RAISE NOTICE '✅ RLSポリシー総数: % 個', policy_count;
END $$;
