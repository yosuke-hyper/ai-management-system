/*
  # organization_membersの自己参照を排除

  ## 問題
  - SELECTポリシー内でorganization_membersテーブルを参照している

  ## 解決策
  - 単純化: 認証済みユーザーは全てのorganization_membersレコードを閲覧可能
  - アプリケーション層でフィルタリング
  - または、user_idのみでチェック
*/

DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;

-- 認証済みユーザーは全て閲覧可能（最もシンプル）
CREATE POLICY "Authenticated users can view members"
ON organization_members FOR SELECT
TO authenticated
USING (true);
