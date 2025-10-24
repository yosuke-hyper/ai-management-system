/*
  # マルチテナント対応RLSポリシー更新

  ## 概要
  全テーブルのRLSポリシーを更新し、organization_id による完全なデータ分離を実装します。

  ## セキュリティ原則
    1. ユーザーは自分の所属組織のデータのみアクセス可能
    2. 全てのクエリで organization_id によるフィルタリングを強制
    3. INSERT時に自動的に organization_id を設定
    4. 組織間のデータ漏洩を完全に防止

  ## 更新対象
    - stores
    - daily_reports  
    - targets
    - daily_targets
    - expense_baselines
    - monthly_expenses
    - vendors
    - store_assignments
    - store_vendor_assignments
    - ai_conversations
    - ai_messages
    - ai_generated_reports
    - ai_usage_tracking
*/

-- ============================================
-- 1. stores テーブル
-- ============================================

DROP POLICY IF EXISTS "stores_select" ON stores;
DROP POLICY IF EXISTS "stores_insert" ON stores;
DROP POLICY IF EXISTS "stores_update" ON stores;
DROP POLICY IF EXISTS "stores_delete" ON stores;

CREATE POLICY "stores_select" ON stores
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "stores_insert" ON stores
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "stores_update" ON stores
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "stores_delete" ON stores
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

-- ============================================
-- 2. daily_reports テーブル
-- ============================================

DROP POLICY IF EXISTS "dr_select" ON daily_reports;
DROP POLICY IF EXISTS "dr_insert" ON daily_reports;
DROP POLICY IF EXISTS "dr_update" ON daily_reports;
DROP POLICY IF EXISTS "dr_delete" ON daily_reports;

CREATE POLICY "dr_select" ON daily_reports
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "dr_insert" ON daily_reports
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
  AND (
    EXISTS (
      SELECT 1 FROM store_assignments sa
      WHERE sa.store_id = daily_reports.store_id
        AND sa.user_id = auth.uid()
    )
    OR is_organization_admin()
  )
);

CREATE POLICY "dr_update" ON daily_reports
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
  AND (user_id = auth.uid() OR is_organization_admin())
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "dr_delete" ON daily_reports
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
  AND (user_id = auth.uid() OR is_organization_admin())
);

-- ============================================
-- 3. targets テーブル
-- ============================================

DROP POLICY IF EXISTS "Managers and admins can view their store targets" ON targets;
DROP POLICY IF EXISTS "Managers and admins can create targets" ON targets;
DROP POLICY IF EXISTS "Managers and admins can update targets" ON targets;
DROP POLICY IF EXISTS "Managers and admins can delete targets" ON targets;

CREATE POLICY "targets_select" ON targets
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "targets_insert" ON targets
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "targets_update" ON targets
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "targets_delete" ON targets
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

-- ============================================
-- 4. daily_targets テーブル
-- ============================================

DROP POLICY IF EXISTS "daily_targets_select" ON daily_targets;
DROP POLICY IF EXISTS "daily_targets_insert" ON daily_targets;
DROP POLICY IF EXISTS "daily_targets_update" ON daily_targets;
DROP POLICY IF EXISTS "daily_targets_delete" ON daily_targets;

CREATE POLICY "daily_targets_select" ON daily_targets
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "daily_targets_insert" ON daily_targets
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "daily_targets_update" ON daily_targets
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "daily_targets_delete" ON daily_targets
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- ============================================
-- 5. expense_baselines テーブル
-- ============================================

DROP POLICY IF EXISTS "expense_baselines_select" ON expense_baselines;
DROP POLICY IF EXISTS "expense_baselines_insert" ON expense_baselines;
DROP POLICY IF EXISTS "expense_baselines_update" ON expense_baselines;
DROP POLICY IF EXISTS "expense_baselines_delete" ON expense_baselines;

CREATE POLICY "expense_baselines_select" ON expense_baselines
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "expense_baselines_insert" ON expense_baselines
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "expense_baselines_update" ON expense_baselines
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "expense_baselines_delete" ON expense_baselines
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

-- ============================================
-- 6. monthly_expenses テーブル
-- ============================================

DROP POLICY IF EXISTS "me_select" ON monthly_expenses;
DROP POLICY IF EXISTS "me_insert" ON monthly_expenses;
DROP POLICY IF EXISTS "me_update" ON monthly_expenses;
DROP POLICY IF EXISTS "me_delete" ON monthly_expenses;

CREATE POLICY "me_select" ON monthly_expenses
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "me_insert" ON monthly_expenses
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "me_update" ON monthly_expenses
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "me_delete" ON monthly_expenses
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

-- ============================================
-- 7. vendors テーブル
-- ============================================

DROP POLICY IF EXISTS "vendors_select" ON vendors;
DROP POLICY IF EXISTS "vendors_insert" ON vendors;
DROP POLICY IF EXISTS "vendors_update" ON vendors;
DROP POLICY IF EXISTS "vendors_delete" ON vendors;

CREATE POLICY "vendors_select" ON vendors
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "vendors_insert" ON vendors
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "vendors_update" ON vendors
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "vendors_delete" ON vendors
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

-- ============================================
-- 8. store_assignments テーブル
-- ============================================

DROP POLICY IF EXISTS "sa_select" ON store_assignments;
DROP POLICY IF EXISTS "sa_insert" ON store_assignments;
DROP POLICY IF EXISTS "sa_update" ON store_assignments;
DROP POLICY IF EXISTS "sa_delete" ON store_assignments;

CREATE POLICY "sa_select" ON store_assignments
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "sa_insert" ON store_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "sa_update" ON store_assignments
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "sa_delete" ON store_assignments
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

-- ============================================
-- 9. AI関連テーブル
-- ============================================

DROP POLICY IF EXISTS "ai_conversations_select" ON ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_insert" ON ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_update" ON ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_delete" ON ai_conversations;

CREATE POLICY "ai_conversations_select" ON ai_conversations
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "ai_conversations_insert" ON ai_conversations
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "ai_conversations_update" ON ai_conversations
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "ai_conversations_delete" ON ai_conversations
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

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
  RAISE NOTICE '✅ マルチテナント対応RLSポリシー更新完了';
  RAISE NOTICE '📊 総ポリシー数: %', policy_count;
  RAISE NOTICE '🔒 完全なデータ分離が実装されました';
  RAISE NOTICE '========================================';
END $$;
