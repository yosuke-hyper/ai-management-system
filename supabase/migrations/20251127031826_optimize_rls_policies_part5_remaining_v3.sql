/*
  # RLSポリシー最適化 Part 5: その他のテーブル

  ## 概要
  残りのテーブルのRLSポリシーを最適化して、Supabase Security Advisorの警告を解決します。

  ## 変更内容
  1. `auth.uid()`を`(select auth.uid())`に置き換えてパフォーマンス向上
  2. 重複する複数のpermissiveポリシーを統合
  3. ポリシー名を明確化

  ## 対象テーブル
  - notifications
  - audit_logs
  - brands
  - subscription_plans
  - organization_subscriptions
  - monthly_expenses
  - expense_baselines
  - report_schedules

  ## パフォーマンス改善
  各ポリシーでauth.uid()をサブクエリ化することで、プランナーの最適化が向上します。
*/

-- ============================================================================
-- notifications テーブル
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = notifications.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- audit_logs テーブル
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can create audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON audit_logs;

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = audit_logs.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Authenticated users can create audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = audit_logs.organization_id
    )
  );

-- ============================================================================
-- brands テーブル
-- ============================================================================

DROP POLICY IF EXISTS "Users can view brands" ON brands;
DROP POLICY IF EXISTS "Admins can manage brands" ON brands;
DROP POLICY IF EXISTS "Members can view brands" ON brands;
DROP POLICY IF EXISTS "Admins can insert brands" ON brands;
DROP POLICY IF EXISTS "Admins can update brands" ON brands;
DROP POLICY IF EXISTS "Admins can delete brands" ON brands;

CREATE POLICY "Members can view brands"
  ON brands FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = brands.organization_id
    )
  );

CREATE POLICY "Admins can insert brands"
  ON brands FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = brands.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can update brands"
  ON brands FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = brands.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = brands.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can delete brands"
  ON brands FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = brands.organization_id
      AND organization_members.role = 'owner'
    )
  );

-- ============================================================================
-- subscription_plans テーブル
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Public can view subscription plans" ON subscription_plans;

CREATE POLICY "Public can view subscription plans"
  ON subscription_plans FOR SELECT
  TO public
  USING (true);

-- ============================================================================
-- organization_subscriptions テーブル
-- ============================================================================

DROP POLICY IF EXISTS "Members can view own organization subscription" ON organization_subscriptions;
DROP POLICY IF EXISTS "Owners can manage subscription" ON organization_subscriptions;
DROP POLICY IF EXISTS "Members can view organization subscription" ON organization_subscriptions;
DROP POLICY IF EXISTS "Owners can update subscription" ON organization_subscriptions;

CREATE POLICY "Members can view organization subscription"
  ON organization_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = organization_subscriptions.organization_id
    )
  );

CREATE POLICY "Owners can update subscription"
  ON organization_subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = organization_subscriptions.organization_id
      AND organization_members.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = organization_subscriptions.organization_id
      AND organization_members.role = 'owner'
    )
  );

-- ============================================================================
-- monthly_expenses テーブル
-- ============================================================================

DROP POLICY IF EXISTS "Members can view monthly expenses" ON monthly_expenses;
DROP POLICY IF EXISTS "Members can insert monthly expenses" ON monthly_expenses;
DROP POLICY IF EXISTS "Members can update monthly expenses" ON monthly_expenses;
DROP POLICY IF EXISTS "Admins can delete monthly expenses" ON monthly_expenses;
DROP POLICY IF EXISTS "Store managers can insert monthly expenses" ON monthly_expenses;
DROP POLICY IF EXISTS "Store managers can update monthly expenses" ON monthly_expenses;

CREATE POLICY "Members can view monthly expenses"
  ON monthly_expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = monthly_expenses.organization_id
    )
  );

CREATE POLICY "Store managers can insert monthly expenses"
  ON monthly_expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = monthly_expenses.organization_id
      AND (
        organization_members.role IN ('owner', 'admin') OR
        organization_members.store_id = monthly_expenses.store_id
      )
    )
  );

CREATE POLICY "Store managers can update monthly expenses"
  ON monthly_expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = monthly_expenses.organization_id
      AND (
        organization_members.role IN ('owner', 'admin') OR
        organization_members.store_id = monthly_expenses.store_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = monthly_expenses.organization_id
      AND (
        organization_members.role IN ('owner', 'admin') OR
        organization_members.store_id = monthly_expenses.store_id
      )
    )
  );

CREATE POLICY "Admins can delete monthly expenses"
  ON monthly_expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = monthly_expenses.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- expense_baselines テーブル
-- ============================================================================

DROP POLICY IF EXISTS "Members can view expense baselines" ON expense_baselines;
DROP POLICY IF EXISTS "Admins can insert expense baselines" ON expense_baselines;
DROP POLICY IF EXISTS "Admins can update expense baselines" ON expense_baselines;
DROP POLICY IF EXISTS "Owners can delete expense baselines" ON expense_baselines;

CREATE POLICY "Members can view expense baselines"
  ON expense_baselines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = expense_baselines.organization_id
    )
  );

CREATE POLICY "Admins can insert expense baselines"
  ON expense_baselines FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = expense_baselines.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can update expense baselines"
  ON expense_baselines FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = expense_baselines.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = expense_baselines.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners can delete expense baselines"
  ON expense_baselines FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = expense_baselines.organization_id
      AND organization_members.role = 'owner'
    )
  );

-- ============================================================================
-- report_schedules テーブル
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view report schedules" ON report_schedules;
DROP POLICY IF EXISTS "Admins can manage report schedules" ON report_schedules;
DROP POLICY IF EXISTS "Admins can insert report schedules" ON report_schedules;
DROP POLICY IF EXISTS "Admins can update report schedules" ON report_schedules;
DROP POLICY IF EXISTS "Admins can delete report schedules" ON report_schedules;

CREATE POLICY "Admins can view report schedules"
  ON report_schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = report_schedules.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can insert report schedules"
  ON report_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = report_schedules.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can update report schedules"
  ON report_schedules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = report_schedules.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = report_schedules.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can delete report schedules"
  ON report_schedules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = report_schedules.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );
