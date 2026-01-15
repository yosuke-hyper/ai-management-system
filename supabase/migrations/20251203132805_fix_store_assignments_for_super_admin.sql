/*
  # スーパー管理者が他組織の店舗割り当てを管理できるように修正

  1. 問題
    - スーパー管理者が他の組織のメンバーに店舗を割り当てようとすると、RLSポリシーで拒否される
    - 現在のポリシーは `auth.uid()` のメンバーシップのみをチェックしている

  2. 解決策
    - `store_assignments` テーブルのポリシーを更新
    - スーパー管理者（`system_admins`）からのアクセスを許可
    - 通常の管理者は自分の組織のみ管理可能（既存の動作を維持）

  3. セキュリティ
    - スーパー管理者のみが全組織にアクセス可能
    - 通常のユーザーは自分の組織のみアクセス可能
    - RLSは引き続き有効
*/

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Admins can manage store assignments" ON store_assignments;
DROP POLICY IF EXISTS "Users can read own store assignments" ON store_assignments;

-- スーパー管理者または管理者が店舗割り当てを管理できるポリシー
CREATE POLICY "Admins and super admins can manage store assignments"
  ON store_assignments
  FOR ALL
  TO authenticated
  USING (
    -- スーパー管理者は全アクセス可能
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = (SELECT auth.uid())
      AND is_active = true
    )
    OR
    -- 通常の管理者は自分の組織のみ
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    -- スーパー管理者は全アクセス可能
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = (SELECT auth.uid())
      AND is_active = true
    )
    OR
    -- 通常の管理者は自分の組織のみ
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin', 'manager')
    )
  );

-- ユーザーが自分の店舗割り当てを読み取れるポリシー
CREATE POLICY "Users can read own store assignments"
  ON store_assignments
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR
    -- スーパー管理者は全アクセス可能
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = (SELECT auth.uid())
      AND is_active = true
    )
  );
