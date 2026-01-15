/*
  # organization_subscriptions の INSERT ポリシーを追加

  ## 問題
  - 既存のポリシーが重複している
  - INSERT 時の WITH CHECK が機能していない

  ## 解決策
  - 重複ポリシーを削除
  - SELECT, INSERT, UPDATE, DELETE ごとに明確なポリシーを作成
  - INSERT ポリシーでは、新しく挿入される organization_id に対して
    ユーザーが owner かどうかをチェック
*/

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Organization owners can manage subscription" ON organization_subscriptions;
DROP POLICY IF EXISTS "Owners can update subscription" ON organization_subscriptions;
DROP POLICY IF EXISTS "Members can view organization subscription" ON organization_subscriptions;

-- SELECT ポリシー: 組織メンバーなら誰でも閲覧可能
CREATE POLICY "Members can view subscription"
  ON organization_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_subscriptions.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- INSERT ポリシー: owner のみ作成可能
CREATE POLICY "Owners can insert subscription"
  ON organization_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_subscriptions.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
    )
  );

-- UPDATE ポリシー: owner のみ更新可能
CREATE POLICY "Owners can update subscription"
  ON organization_subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_subscriptions.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_subscriptions.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
    )
  );

-- DELETE ポリシー: owner のみ削除可能
CREATE POLICY "Owners can delete subscription"
  ON organization_subscriptions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_subscriptions.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
    )
  );
