/*
  # RLSポリシーの最適化 Part 2

  ## 修正テーブル
  - store_assignments
  - daily_reports  
  - vendors
  - daily_report_vendor_purchases
  - targets
  - summary_data
*/

-- ==========================================
-- store_assignments テーブル
-- ==========================================

DROP POLICY IF EXISTS "Managers can view all store assignments" ON store_assignments;
CREATE POLICY "Managers can view all store assignments"
  ON store_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = store_assignments.organization_id
      AND organization_members.role IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Managers can add store assignments" ON store_assignments;
CREATE POLICY "Managers can add store assignments"
  ON store_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = store_assignments.organization_id
      AND organization_members.role IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Managers can remove store assignments" ON store_assignments;
CREATE POLICY "Managers can remove store assignments"
  ON store_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = store_assignments.organization_id
      AND organization_members.role IN ('owner', 'admin', 'manager')
    )
  );

-- ==========================================
-- daily_reports テーブル
-- ==========================================

DROP POLICY IF EXISTS "Users can read reports for assigned stores" ON daily_reports;
CREATE POLICY "Users can read reports for assigned stores"
  ON daily_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = daily_reports.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can insert reports for assigned stores" ON daily_reports;
CREATE POLICY "Users can insert reports for assigned stores"
  ON daily_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = daily_reports.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can update own reports for assigned stores" ON daily_reports;
CREATE POLICY "Users can update own reports for assigned stores"
  ON daily_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = daily_reports.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = daily_reports.organization_id
    )
  );

DROP POLICY IF EXISTS "dr_delete" ON daily_reports;
CREATE POLICY "dr_delete"
  ON daily_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = daily_reports.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "dr_insert" ON daily_reports;
DROP POLICY IF EXISTS "dr_update" ON daily_reports;

-- ==========================================
-- vendors テーブル
-- ==========================================

DROP POLICY IF EXISTS "vendors_select_policy" ON vendors;
CREATE POLICY "vendors_select_policy"
  ON vendors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = vendors.organization_id
    )
  );

DROP POLICY IF EXISTS "vendors_insert_policy" ON vendors;
CREATE POLICY "vendors_insert_policy"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = vendors.organization_id
      AND organization_members.role IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "vendors_update_policy" ON vendors;
CREATE POLICY "vendors_update_policy"
  ON vendors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = vendors.organization_id
      AND organization_members.role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = vendors.organization_id
      AND organization_members.role IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "vendors_delete_policy" ON vendors;
CREATE POLICY "vendors_delete_policy"
  ON vendors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = vendors.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- ==========================================
-- daily_report_vendor_purchases テーブル
-- ==========================================

DROP POLICY IF EXISTS "Users can read vendor purchases for accessible stores" ON daily_report_vendor_purchases;
CREATE POLICY "Users can read vendor purchases for accessible stores"
  ON daily_report_vendor_purchases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = daily_report_vendor_purchases.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can insert vendor purchases for accessible stores" ON daily_report_vendor_purchases;
CREATE POLICY "Users can insert vendor purchases for accessible stores"
  ON daily_report_vendor_purchases FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = daily_report_vendor_purchases.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can insert vendor purchases for own reports" ON daily_report_vendor_purchases;
DROP POLICY IF EXISTS "Users can view vendor purchases for accessible reports" ON daily_report_vendor_purchases;

DROP POLICY IF EXISTS "Users can update vendor purchases for accessible stores" ON daily_report_vendor_purchases;
CREATE POLICY "Users can update vendor purchases for accessible stores"
  ON daily_report_vendor_purchases FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = daily_report_vendor_purchases.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = daily_report_vendor_purchases.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can update own vendor purchases" ON daily_report_vendor_purchases;

DROP POLICY IF EXISTS "Users can delete own vendor purchases" ON daily_report_vendor_purchases;
CREATE POLICY "Users can delete own vendor purchases"
  ON daily_report_vendor_purchases FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = daily_report_vendor_purchases.organization_id
      AND organization_members.role IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "drvp_delete" ON daily_report_vendor_purchases;
DROP POLICY IF EXISTS "drvp_insert" ON daily_report_vendor_purchases;
DROP POLICY IF EXISTS "drvp_select" ON daily_report_vendor_purchases;
DROP POLICY IF EXISTS "drvp_update" ON daily_report_vendor_purchases;

-- ==========================================
-- targets テーブル
-- ==========================================

DROP POLICY IF EXISTS "Users can view targets for assigned stores" ON targets;
CREATE POLICY "Users can view targets for assigned stores"
  ON targets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = targets.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can view targets for accessible stores" ON targets;
DROP POLICY IF EXISTS "targets_select" ON targets;

DROP POLICY IF EXISTS "Managers can create targets" ON targets;
CREATE POLICY "Managers can create targets"
  ON targets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = targets.organization_id
      AND organization_members.role IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "targets_insert" ON targets;

DROP POLICY IF EXISTS "Managers can update targets" ON targets;
CREATE POLICY "Managers can update targets"
  ON targets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = targets.organization_id
      AND organization_members.role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = targets.organization_id
      AND organization_members.role IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "targets_update" ON targets;

DROP POLICY IF EXISTS "Admins can delete targets" ON targets;
DROP POLICY IF EXISTS "Managers can delete targets" ON targets;
CREATE POLICY "Admins and managers can delete targets"
  ON targets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = targets.organization_id
      AND organization_members.role IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "targets_delete" ON targets;

-- ==========================================
-- summary_data テーブル
-- ==========================================

DROP POLICY IF EXISTS "Users can read summary data for assigned stores" ON summary_data;
CREATE POLICY "Users can read summary data for assigned stores"
  ON summary_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = summary_data.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can view summary for assigned stores" ON summary_data;