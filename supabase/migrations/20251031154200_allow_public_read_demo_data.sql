/*
  # デモデータの公開読み取りを許可

  1. 変更内容
    - demo_organizations: 誰でも読み取り可能に
    - demo_stores: 誰でも読み取り可能に
    - demo_reports: 誰でも読み取り可能に
    - demo_sessions: トークンによる読み取りは維持

  2. 理由
    - Supabase JavaScriptクライアントはカスタムヘッダーを送信できない
    - デモデータは機密情報ではない
    - 誰でも見られるデモ環境として設計

  3. セキュリティ
    - 書き込み操作は引き続きセッショントークンで保護
    - 本番データとは完全に分離
*/

-- demo_organizations の既存SELECTポリシーを削除して再作成
DROP POLICY IF EXISTS "Demo orgs readable by demo session" ON demo_organizations;

CREATE POLICY "Anyone can read demo organizations"
  ON demo_organizations
  FOR SELECT
  TO public
  USING (true);

-- demo_stores の既存SELECTポリシーを削除して再作成
DROP POLICY IF EXISTS "Demo stores readable by demo session" ON demo_stores;

CREATE POLICY "Anyone can read demo stores"
  ON demo_stores
  FOR SELECT
  TO public
  USING (true);

-- demo_reports の既存SELECTポリシーを削除して再作成
DROP POLICY IF EXISTS "Demo reports readable by demo session" ON demo_reports;

CREATE POLICY "Anyone can read demo reports"
  ON demo_reports
  FOR SELECT
  TO public
  USING (true);
