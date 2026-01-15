/*
  # RLSポリシーの最適化 Part 3 - AI関連

  ## 修正テーブル
  - ai_conversations
  - ai_messages
  - daily_targets
  - ai_generated_reports
  - ai_usage_tracking
  - ai_usage_settings
  - ai_usage_limits
*/

-- ==========================================
-- ai_conversations テーブル
-- ==========================================

DROP POLICY IF EXISTS "Users can view own conversations" ON ai_conversations;
CREATE POLICY "Users can view own conversations"
  ON ai_conversations FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own conversations" ON ai_conversations;
CREATE POLICY "Users can create own conversations"
  ON ai_conversations FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON ai_conversations;
CREATE POLICY "Users can update own conversations"
  ON ai_conversations FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON ai_conversations;
CREATE POLICY "Users can delete own conversations"
  ON ai_conversations FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ==========================================
-- ai_messages テーブル
-- ==========================================

DROP POLICY IF EXISTS "Users can view messages in own conversations" ON ai_messages;
CREATE POLICY "Users can view messages in own conversations"
  ON ai_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create messages in own conversations" ON ai_messages;
CREATE POLICY "Users can create messages in own conversations"
  ON ai_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = (select auth.uid())
    )
  );

-- ==========================================
-- daily_targets テーブル
-- ==========================================

DROP POLICY IF EXISTS "Admins can view all daily targets" ON daily_targets;
CREATE POLICY "Admins can view all daily targets"
  ON daily_targets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = daily_targets.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers and staff can view their store daily targets" ON daily_targets;
CREATE POLICY "Managers and staff can view their store daily targets"
  ON daily_targets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = daily_targets.organization_id
    )
  );

DROP POLICY IF EXISTS "daily_targets_select" ON daily_targets;

DROP POLICY IF EXISTS "Admins can create daily targets" ON daily_targets;
CREATE POLICY "Admins can create daily targets"
  ON daily_targets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = daily_targets.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can create their store daily targets" ON daily_targets;
CREATE POLICY "Managers can create their store daily targets"
  ON daily_targets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = daily_targets.organization_id
      AND organization_members.role IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "daily_targets_insert" ON daily_targets;

DROP POLICY IF EXISTS "Admins can update daily targets" ON daily_targets;
CREATE POLICY "Admins can update daily targets"
  ON daily_targets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = daily_targets.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = daily_targets.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can update their store daily targets" ON daily_targets;
CREATE POLICY "Managers can update their store daily targets"
  ON daily_targets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = daily_targets.organization_id
      AND organization_members.role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = daily_targets.organization_id
      AND organization_members.role IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "daily_targets_update" ON daily_targets;

DROP POLICY IF EXISTS "Admins can delete daily targets" ON daily_targets;
DROP POLICY IF EXISTS "Managers can delete their store daily targets" ON daily_targets;
CREATE POLICY "Admins and managers can delete daily targets"
  ON daily_targets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = daily_targets.organization_id
      AND organization_members.role IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "daily_targets_delete" ON daily_targets;

-- ==========================================
-- ai_generated_reports テーブル
-- ==========================================

DROP POLICY IF EXISTS "Managers can view reports for their stores" ON ai_generated_reports;
CREATE POLICY "Managers can view reports for their stores"
  ON ai_generated_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = ai_generated_reports.organization_id
    )
  );

DROP POLICY IF EXISTS "Staff can view reports for their store" ON ai_generated_reports;
DROP POLICY IF EXISTS "Admins can view all AI reports" ON ai_generated_reports;
DROP POLICY IF EXISTS "ai_generated_reports_select" ON ai_generated_reports;

DROP POLICY IF EXISTS "Authenticated users can update their accessible reports" ON ai_generated_reports;
CREATE POLICY "Authenticated users can update their accessible reports"
  ON ai_generated_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = ai_generated_reports.organization_id
      AND organization_members.role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = ai_generated_reports.organization_id
      AND organization_members.role IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "ai_generated_reports_update" ON ai_generated_reports;
DROP POLICY IF EXISTS "Admins can insert AI reports" ON ai_generated_reports;
DROP POLICY IF EXISTS "ai_generated_reports_insert" ON ai_generated_reports;
DROP POLICY IF EXISTS "Admins can delete AI reports" ON ai_generated_reports;
DROP POLICY IF EXISTS "ai_generated_reports_delete" ON ai_generated_reports;

-- ==========================================
-- ai_usage_tracking テーブル
-- ==========================================

DROP POLICY IF EXISTS "Users can view own usage tracking" ON ai_usage_tracking;
CREATE POLICY "Users can view own usage tracking"
  ON ai_usage_tracking FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own usage tracking" ON ai_usage_tracking;
CREATE POLICY "Users can create own usage tracking"
  ON ai_usage_tracking FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own usage tracking" ON ai_usage_tracking;
CREATE POLICY "Users can update own usage tracking"
  ON ai_usage_tracking FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ==========================================
-- ai_usage_settings テーブル
-- ==========================================

DROP POLICY IF EXISTS "Users can view org ai usage settings" ON ai_usage_settings;
CREATE POLICY "Users can view org ai usage settings"
  ON ai_usage_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = ai_usage_settings.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can view own store ai usage settings" ON ai_usage_settings;

DROP POLICY IF EXISTS "Admins can insert org ai usage settings" ON ai_usage_settings;
DROP POLICY IF EXISTS "Admins can insert own org ai usage settings" ON ai_usage_settings;
CREATE POLICY "Admins can insert ai usage settings"
  ON ai_usage_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = ai_usage_settings.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update org ai usage settings" ON ai_usage_settings;
DROP POLICY IF EXISTS "Admins can update own org ai usage settings" ON ai_usage_settings;
CREATE POLICY "Admins can update ai usage settings"
  ON ai_usage_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = ai_usage_settings.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = ai_usage_settings.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- ==========================================
-- ai_usage_limits テーブル
-- ==========================================

DROP POLICY IF EXISTS "Organization members can view ai usage limits" ON ai_usage_limits;
CREATE POLICY "Organization members can view ai usage limits"
  ON ai_usage_limits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = ai_usage_limits.organization_id
    )
  );

DROP POLICY IF EXISTS "Admins can insert ai usage limits" ON ai_usage_limits;
CREATE POLICY "Admins can insert ai usage limits"
  ON ai_usage_limits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = ai_usage_limits.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update ai usage limits" ON ai_usage_limits;
CREATE POLICY "Admins can update ai usage limits"
  ON ai_usage_limits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = ai_usage_limits.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = ai_usage_limits.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );