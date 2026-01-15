/*
  # profilesテーブルの完全な無限再帰修正

  ## 解決策
  - auth.uid()のみを使用し、他のテーブルを一切参照しない
  - 自分自身のプロファイルのみ閲覧可能
  - アプリケーション側で必要に応じて組織メンバーを取得
*/

-- ============================================
-- 1. 既存のSELECTポリシーを削除
-- ============================================

DROP POLICY IF EXISTS "profiles_select_simple" ON profiles;

-- ============================================
-- 2. 完全に再帰のないポリシーを作成
-- ============================================

CREATE POLICY "profiles_select_own"
ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- ============================================
-- 3. 管理者用の追加ポリシー（app_metadataを使用）
-- ============================================

CREATE POLICY "profiles_select_admin"
ON profiles
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  OR
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);
