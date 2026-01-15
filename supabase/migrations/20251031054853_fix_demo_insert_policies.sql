/*
  # デモテーブルのINSERTポリシー修正

  1. 変更内容
    - demo_organizations: INSERTポリシーを追加（誰でも作成可能）
    - demo_stores: INSERTポリシーに WITH CHECK を追加
    - demo_reports: INSERTポリシーに WITH CHECK を追加

  2. セキュリティ
    - デモセッション作成時に組織を作成できるように
    - 作成後はセッショントークンで保護
*/

-- demo_organizations の既存ポリシーを削除して再作成
DROP POLICY IF EXISTS "Demo orgs accessible by demo session" ON demo_organizations;

-- SELECT/UPDATE/DELETE用のポリシー
CREATE POLICY "Demo orgs readable by demo session"
  ON demo_organizations
  FOR SELECT
  USING (
    id IN (
      SELECT demo_org_id FROM demo_sessions
      WHERE session_token = current_setting('request.headers', true)::json->>'x-demo-token'
      AND expires_at > now()
    )
  );

CREATE POLICY "Demo orgs updatable by demo session"
  ON demo_organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT demo_org_id FROM demo_sessions
      WHERE session_token = current_setting('request.headers', true)::json->>'x-demo-token'
      AND expires_at > now()
    )
  )
  WITH CHECK (
    id IN (
      SELECT demo_org_id FROM demo_sessions
      WHERE session_token = current_setting('request.headers', true)::json->>'x-demo-token'
      AND expires_at > now()
    )
  );

CREATE POLICY "Demo orgs deletable by demo session"
  ON demo_organizations
  FOR DELETE
  USING (
    id IN (
      SELECT demo_org_id FROM demo_sessions
      WHERE session_token = current_setting('request.headers', true)::json->>'x-demo-token'
      AND expires_at > now()
    )
  );

-- INSERT用のポリシー（誰でも作成可能、セッション作成時に必要）
CREATE POLICY "Anyone can create demo organization"
  ON demo_organizations
  FOR INSERT
  WITH CHECK (true);

-- demo_stores の既存ポリシーを削除して再作成
DROP POLICY IF EXISTS "Demo stores accessible by demo session" ON demo_stores;

CREATE POLICY "Demo stores readable by demo session"
  ON demo_stores
  FOR SELECT
  USING (
    demo_org_id IN (
      SELECT demo_org_id FROM demo_sessions
      WHERE session_token = current_setting('request.headers', true)::json->>'x-demo-token'
      AND expires_at > now()
    )
  );

CREATE POLICY "Demo stores insertable by demo session"
  ON demo_stores
  FOR INSERT
  WITH CHECK (
    demo_org_id IN (
      SELECT demo_org_id FROM demo_sessions
      WHERE session_token = current_setting('request.headers', true)::json->>'x-demo-token'
      AND expires_at > now()
    )
  );

CREATE POLICY "Demo stores updatable by demo session"
  ON demo_stores
  FOR UPDATE
  USING (
    demo_org_id IN (
      SELECT demo_org_id FROM demo_sessions
      WHERE session_token = current_setting('request.headers', true)::json->>'x-demo-token'
      AND expires_at > now()
    )
  )
  WITH CHECK (
    demo_org_id IN (
      SELECT demo_org_id FROM demo_sessions
      WHERE session_token = current_setting('request.headers', true)::json->>'x-demo-token'
      AND expires_at > now()
    )
  );

CREATE POLICY "Demo stores deletable by demo session"
  ON demo_stores
  FOR DELETE
  USING (
    demo_org_id IN (
      SELECT demo_org_id FROM demo_sessions
      WHERE session_token = current_setting('request.headers', true)::json->>'x-demo-token'
      AND expires_at > now()
    )
  );

-- demo_reports の既存ポリシーを削除して再作成
DROP POLICY IF EXISTS "Demo reports accessible by demo session" ON demo_reports;

CREATE POLICY "Demo reports readable by demo session"
  ON demo_reports
  FOR SELECT
  USING (
    demo_org_id IN (
      SELECT demo_org_id FROM demo_sessions
      WHERE session_token = current_setting('request.headers', true)::json->>'x-demo-token'
      AND expires_at > now()
    )
  );

CREATE POLICY "Demo reports insertable by demo session"
  ON demo_reports
  FOR INSERT
  WITH CHECK (
    demo_org_id IN (
      SELECT demo_org_id FROM demo_sessions
      WHERE session_token = current_setting('request.headers', true)::json->>'x-demo-token'
      AND expires_at > now()
    )
  );

CREATE POLICY "Demo reports updatable by demo session"
  ON demo_reports
  FOR UPDATE
  USING (
    demo_org_id IN (
      SELECT demo_org_id FROM demo_sessions
      WHERE session_token = current_setting('request.headers', true)::json->>'x-demo-token'
      AND expires_at > now()
    )
  )
  WITH CHECK (
    demo_org_id IN (
      SELECT demo_org_id FROM demo_sessions
      WHERE session_token = current_setting('request.headers', true)::json->>'x-demo-token'
      AND expires_at > now()
    )
  );

CREATE POLICY "Demo reports deletable by demo session"
  ON demo_reports
  FOR DELETE
  USING (
    demo_org_id IN (
      SELECT demo_org_id FROM demo_sessions
      WHERE session_token = current_setting('request.headers', true)::json->>'x-demo-token'
      AND expires_at > now()
    )
  );
