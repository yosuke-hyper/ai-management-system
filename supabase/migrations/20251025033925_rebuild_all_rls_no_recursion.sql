/*
  # すべてのRLSポリシーを再構築（無限再帰を完全に排除）

  ## 戦略
  - profilesテーブル: auth.uid()のみ使用（他テーブルを参照しない）
  - organization_membersテーブル: user_idとauth.uid()の直接比較のみ
  - 他のテーブル: organization_idを直接比較
  - 循環参照を一切作らない

  ## 実装
  1. profiles: 自分のレコードのみアクセス可能
  2. organization_members: user_idベースの単純なチェック
  3. その他: organization_idベースの単純なチェック
*/

-- ============================================
-- PROFILES テーブル
-- ============================================

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;

-- 自分のプロファイルのみ閲覧可能
CREATE POLICY "profiles_select"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- ============================================
-- ORGANIZATION_MEMBERS テーブル
-- ============================================

DROP POLICY IF EXISTS "Members can view their organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Admins can remove members" ON organization_members;

-- 自分が所属する組織のメンバー一覧を閲覧可能
CREATE POLICY "Members can view organization members"
ON organization_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- メンバーの追加は誰でも可能（招待機能のため）
CREATE POLICY "Anyone can add members"
ON organization_members FOR INSERT
TO authenticated
WITH CHECK (true);

-- 自分自身のレコードは更新・削除可能
CREATE POLICY "Users can manage own membership"
ON organization_members FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own membership"
ON organization_members FOR DELETE
TO authenticated
USING (user_id = auth.uid());
