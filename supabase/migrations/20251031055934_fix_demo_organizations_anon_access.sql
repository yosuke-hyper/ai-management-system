/*
  # デモ組織のINSERTポリシー修正（anonロール対応）

  1. 問題
    - "Anyone can create demo organization"ポリシーが機能していない
    - anonロールでのINSERTが拒否される

  2. 解決策
    - ポリシーを削除して再作成
    - 明示的にTO publicを指定
    - WITH CHECK (true)を確認

  3. セキュリティ
    - 匿名ユーザーがデモ組織を作成できる
    - 作成後はセッショントークンで保護
*/

-- 既存のINSERTポリシーを削除
DROP POLICY IF EXISTS "Anyone can create demo organization" ON demo_organizations;

-- 新しいINSERTポリシーを作成
CREATE POLICY "Anyone can create demo organization"
  ON demo_organizations
  FOR INSERT
  TO public
  WITH CHECK (true);

-- demo_sessionsテーブルも確認
DROP POLICY IF EXISTS "Anyone can create demo session" ON demo_sessions;

CREATE POLICY "Anyone can create demo session"
  ON demo_sessions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- demo_storesテーブルも確認
DROP POLICY IF EXISTS "Anyone can create demo stores" ON demo_stores;

CREATE POLICY "Anyone can create demo stores"
  ON demo_stores
  FOR INSERT
  TO public
  WITH CHECK (true);
