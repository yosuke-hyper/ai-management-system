/*
  # RLSポリシーの最適化

  ## 概要
  auth.uid() を (select auth.uid()) に変更してパフォーマンスを改善

  ## 修正内容
  profiles, error_logs, stores, organizations, organization_members テーブルの
  RLSポリシーを最適化
*/

-- ==========================================
-- profiles テーブル
-- ==========================================

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = profiles.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
CREATE POLICY "Users can view profiles in their organization"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = profiles.organization_id
    )
  );

DROP POLICY IF EXISTS "Managers can read member profiles" ON profiles;
CREATE POLICY "Managers can read member profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = profiles.organization_id
      AND organization_members.role IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- ==========================================
-- error_logs テーブル
-- ==========================================

DROP POLICY IF EXISTS "Users can create own error logs" ON error_logs;
CREATE POLICY "Users can create own error logs"
  ON error_logs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can view own error logs" ON error_logs;
CREATE POLICY "Users can view own error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can view all error logs" ON error_logs;
CREATE POLICY "Admins can view all error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = error_logs.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update error logs" ON error_logs;
CREATE POLICY "Admins can update error logs"
  ON error_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = error_logs.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = error_logs.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete error logs" ON error_logs;
CREATE POLICY "Admins can delete error logs"
  ON error_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = error_logs.organization_id
      AND organization_members.role = 'owner'
    )
  );

-- ==========================================
-- stores テーブル
-- ==========================================

DROP POLICY IF EXISTS "Admins can manage stores" ON stores;
CREATE POLICY "Admins can manage stores"
  ON stores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = stores.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = stores.organization_id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- ==========================================
-- organizations テーブル
-- ==========================================

DROP POLICY IF EXISTS "Members can view their organization" ON organizations;
CREATE POLICY "Members can view their organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = organizations.id
    )
  );

DROP POLICY IF EXISTS "Owners and admins can update organization" ON organizations;
CREATE POLICY "Owners and admins can update organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = organizations.id
      AND organization_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = (select auth.uid())
      AND organization_members.organization_id = organizations.id
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- ==========================================
-- organization_members テーブル
-- ==========================================

DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
CREATE POLICY "Admins can update members"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = (select auth.uid())
      AND om.organization_id = organization_members.organization_id
      AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = (select auth.uid())
      AND om.organization_id = organization_members.organization_id
      AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can delete own membership" ON organization_members;
CREATE POLICY "Users can delete own membership"
  ON organization_members FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage own membership" ON organization_members;
CREATE POLICY "Users can manage own membership"
  ON organization_members FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);