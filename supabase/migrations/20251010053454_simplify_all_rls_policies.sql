/*
  # 全テーブルのRLSポリシー簡素化

  ## 目的
  パフォーマンス向上と無限再帰防止のため、全てのRLSポリシーを最適化

  ## 変更内容
  - サブクエリを最小限に
  - インデックスを活用した高速なチェック
  - 読み取り専用操作の最適化
*/

-- ============================================
-- 1. stores テーブル
-- ============================================

DROP POLICY IF EXISTS "stores_select" ON stores;
DROP POLICY IF EXISTS "stores_insert" ON stores;
DROP POLICY IF EXISTS "stores_update" ON stores;
DROP POLICY IF EXISTS "stores_delete" ON stores;

CREATE POLICY "stores_select" ON stores
FOR SELECT TO authenticated
USING (
  organization_id = get_user_organization_id()
);

CREATE POLICY "stores_insert" ON stores
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = get_user_organization_id()
  AND is_organization_admin()
);

CREATE POLICY "stores_update" ON stores
FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id() AND is_organization_admin())
WITH CHECK (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "stores_delete" ON stores
FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id() AND is_organization_admin());

-- ============================================
-- 2. vendors テーブル
-- ============================================

DROP POLICY IF EXISTS "vendors_select" ON vendors;
DROP POLICY IF EXISTS "vendors_insert" ON vendors;
DROP POLICY IF EXISTS "vendors_update" ON vendors;
DROP POLICY IF EXISTS "vendors_delete" ON vendors;

CREATE POLICY "vendors_select" ON vendors
FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id());

CREATE POLICY "vendors_insert" ON vendors
FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "vendors_update" ON vendors
FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id() AND is_organization_admin())
WITH CHECK (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "vendors_delete" ON vendors
FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id() AND is_organization_admin());

-- ============================================
-- 3. store_assignments テーブル
-- ============================================

DROP POLICY IF EXISTS "sa_select" ON store_assignments;
DROP POLICY IF EXISTS "sa_insert" ON store_assignments;
DROP POLICY IF EXISTS "sa_update" ON store_assignments;
DROP POLICY IF EXISTS "sa_delete" ON store_assignments;

CREATE POLICY "sa_select" ON store_assignments
FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id());

CREATE POLICY "sa_insert" ON store_assignments
FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "sa_update" ON store_assignments
FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id() AND is_organization_admin())
WITH CHECK (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "sa_delete" ON store_assignments
FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id() AND is_organization_admin());

-- ============================================
-- 4. store_vendor_assignments テーブル
-- ============================================

DROP POLICY IF EXISTS "sva_select" ON store_vendor_assignments;
DROP POLICY IF EXISTS "sva_insert" ON store_vendor_assignments;
DROP POLICY IF EXISTS "sva_update" ON store_vendor_assignments;
DROP POLICY IF EXISTS "sva_delete" ON store_vendor_assignments;

CREATE POLICY "sva_select" ON store_vendor_assignments
FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id());

CREATE POLICY "sva_insert" ON store_vendor_assignments
FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "sva_update" ON store_vendor_assignments
FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id() AND is_organization_admin())
WITH CHECK (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "sva_delete" ON store_vendor_assignments
FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id() AND is_organization_admin());

-- ============================================
-- 5. daily_reports テーブル
-- ============================================

DROP POLICY IF EXISTS "dr_select" ON daily_reports;
DROP POLICY IF EXISTS "dr_insert" ON daily_reports;
DROP POLICY IF EXISTS "dr_update" ON daily_reports;
DROP POLICY IF EXISTS "dr_delete" ON daily_reports;

CREATE POLICY "dr_select" ON daily_reports
FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id());

CREATE POLICY "dr_insert" ON daily_reports
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = get_user_organization_id()
  AND (
    user_id = auth.uid()
    OR is_organization_admin()
  )
);

CREATE POLICY "dr_update" ON daily_reports
FOR UPDATE TO authenticated
USING (
  organization_id = get_user_organization_id()
  AND (user_id = auth.uid() OR is_organization_admin())
)
WITH CHECK (
  organization_id = get_user_organization_id()
);

CREATE POLICY "dr_delete" ON daily_reports
FOR DELETE TO authenticated
USING (
  organization_id = get_user_organization_id()
  AND (user_id = auth.uid() OR is_organization_admin())
);

-- ============================================
-- 6. daily_report_vendor_purchases テーブル
-- ============================================

DROP POLICY IF EXISTS "drvp_select" ON daily_report_vendor_purchases;
DROP POLICY IF EXISTS "drvp_insert" ON daily_report_vendor_purchases;
DROP POLICY IF EXISTS "drvp_update" ON daily_report_vendor_purchases;
DROP POLICY IF EXISTS "drvp_delete" ON daily_report_vendor_purchases;

CREATE POLICY "drvp_select" ON daily_report_vendor_purchases
FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id());

CREATE POLICY "drvp_insert" ON daily_report_vendor_purchases
FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "drvp_update" ON daily_report_vendor_purchases
FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "drvp_delete" ON daily_report_vendor_purchases
FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id());

-- ============================================
-- 7. targets テーブル
-- ============================================

DROP POLICY IF EXISTS "targets_select" ON targets;
DROP POLICY IF EXISTS "targets_insert" ON targets;
DROP POLICY IF EXISTS "targets_update" ON targets;
DROP POLICY IF EXISTS "targets_delete" ON targets;

CREATE POLICY "targets_select" ON targets
FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id());

CREATE POLICY "targets_insert" ON targets
FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "targets_update" ON targets
FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id() AND is_organization_admin())
WITH CHECK (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "targets_delete" ON targets
FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id() AND is_organization_admin());

-- ============================================
-- 8. daily_targets テーブル
-- ============================================

DROP POLICY IF EXISTS "daily_targets_select" ON daily_targets;
DROP POLICY IF EXISTS "daily_targets_insert" ON daily_targets;
DROP POLICY IF EXISTS "daily_targets_update" ON daily_targets;
DROP POLICY IF EXISTS "daily_targets_delete" ON daily_targets;

CREATE POLICY "daily_targets_select" ON daily_targets
FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id());

CREATE POLICY "daily_targets_insert" ON daily_targets
FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "daily_targets_update" ON daily_targets
FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "daily_targets_delete" ON daily_targets
FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id());

-- ============================================
-- 9. monthly_expenses テーブル
-- ============================================

DROP POLICY IF EXISTS "me_select" ON monthly_expenses;
DROP POLICY IF EXISTS "me_insert" ON monthly_expenses;
DROP POLICY IF EXISTS "me_update" ON monthly_expenses;
DROP POLICY IF EXISTS "me_delete" ON monthly_expenses;

CREATE POLICY "me_select" ON monthly_expenses
FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id());

CREATE POLICY "me_insert" ON monthly_expenses
FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "me_update" ON monthly_expenses
FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id() AND is_organization_admin())
WITH CHECK (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "me_delete" ON monthly_expenses
FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id() AND is_organization_admin());

-- ============================================
-- 10. expense_baselines テーブル
-- ============================================

DROP POLICY IF EXISTS "expense_baselines_select" ON expense_baselines;
DROP POLICY IF EXISTS "expense_baselines_insert" ON expense_baselines;
DROP POLICY IF EXISTS "expense_baselines_update" ON expense_baselines;
DROP POLICY IF EXISTS "expense_baselines_delete" ON expense_baselines;

CREATE POLICY "expense_baselines_select" ON expense_baselines
FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id());

CREATE POLICY "expense_baselines_insert" ON expense_baselines
FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "expense_baselines_update" ON expense_baselines
FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id() AND is_organization_admin())
WITH CHECK (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "expense_baselines_delete" ON expense_baselines
FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id() AND is_organization_admin());

-- ============================================
-- 11. AI関連テーブル
-- ============================================

-- ai_conversations
DROP POLICY IF EXISTS "ai_conversations_select" ON ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_insert" ON ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_update" ON ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_delete" ON ai_conversations;

CREATE POLICY "ai_conversations_select" ON ai_conversations
FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id());

CREATE POLICY "ai_conversations_insert" ON ai_conversations
FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "ai_conversations_update" ON ai_conversations
FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "ai_conversations_delete" ON ai_conversations
FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id());

-- ai_messages
DROP POLICY IF EXISTS "ai_messages_select" ON ai_messages;
DROP POLICY IF EXISTS "ai_messages_insert" ON ai_messages;
DROP POLICY IF EXISTS "ai_messages_update" ON ai_messages;
DROP POLICY IF EXISTS "ai_messages_delete" ON ai_messages;

CREATE POLICY "ai_messages_select" ON ai_messages
FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id());

CREATE POLICY "ai_messages_insert" ON ai_messages
FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "ai_messages_update" ON ai_messages
FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "ai_messages_delete" ON ai_messages
FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id());

-- ai_generated_reports
DROP POLICY IF EXISTS "ai_generated_reports_select" ON ai_generated_reports;
DROP POLICY IF EXISTS "ai_generated_reports_insert" ON ai_generated_reports;
DROP POLICY IF EXISTS "ai_generated_reports_update" ON ai_generated_reports;
DROP POLICY IF EXISTS "ai_generated_reports_delete" ON ai_generated_reports;

CREATE POLICY "ai_generated_reports_select" ON ai_generated_reports
FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id());

CREATE POLICY "ai_generated_reports_insert" ON ai_generated_reports
FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "ai_generated_reports_update" ON ai_generated_reports
FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "ai_generated_reports_delete" ON ai_generated_reports
FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id());

-- ============================================
-- 確認メッセージ
-- ============================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 全RLSポリシー簡素化完了';
  RAISE NOTICE '📊 総ポリシー数: %', policy_count;
  RAISE NOTICE '⚡ パフォーマンス最適化完了';
  RAISE NOTICE '========================================';
END $$;
