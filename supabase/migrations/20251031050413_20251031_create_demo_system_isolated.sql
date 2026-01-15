/*
  # デモシステム完全分離版

  1. 新規テーブル
    - `demo_sessions` - デモセッション管理（14日間有効）
      - `id` (uuid, primary key)
      - `email` (text) - デモユーザーのメールアドレス
      - `session_token` (text, unique) - セッション識別子
      - `demo_org_id` (uuid) - デモ組織ID
      - `expires_at` (timestamptz) - 有効期限（作成から14日後）
      - `created_at` (timestamptz)
      - `last_accessed_at` (timestamptz)
    
    - `demo_organizations` - デモ組織データ
      - `id` (uuid, primary key)
      - `name` (text)
      - `created_at` (timestamptz)
    
    - `demo_stores` - デモ店舗データ
      - `id` (uuid, primary key)
      - `demo_org_id` (uuid, foreign key)
      - `name` (text)
      - `created_at` (timestamptz)
    
    - `demo_reports` - デモ日報データ
      - `id` (uuid, primary key)
      - `demo_org_id` (uuid, foreign key)
      - `demo_store_id` (uuid, foreign key)
      - `date` (date)
      - `sales` (numeric)
      - `customer_count` (integer)
      - ... (他の日報フィールド)
      - `created_at` (timestamptz)

  2. セキュリティ
    - RLS有効化
    - デモセッショントークンによる認証
    - 本番データとの完全分離

  3. 自動クリーンアップ
    - 期限切れデモセッションの自動削除関数
*/

-- デモセッションテーブル
CREATE TABLE IF NOT EXISTS demo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  session_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  demo_org_id uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now()
);

ALTER TABLE demo_sessions ENABLE ROW LEVEL SECURITY;

-- デモセッションポリシー: トークンで自分のセッションのみアクセス可能
CREATE POLICY "Demo sessions accessible by token"
  ON demo_sessions
  FOR SELECT
  USING (
    session_token = current_setting('request.headers', true)::json->>'x-demo-token'
    AND expires_at > now()
  );

CREATE POLICY "Anyone can create demo session"
  ON demo_sessions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Demo sessions can update own last_accessed"
  ON demo_sessions
  FOR UPDATE
  USING (
    session_token = current_setting('request.headers', true)::json->>'x-demo-token'
    AND expires_at > now()
  )
  WITH CHECK (
    session_token = current_setting('request.headers', true)::json->>'x-demo-token'
    AND expires_at > now()
  );

-- デモ組織テーブル
CREATE TABLE IF NOT EXISTS demo_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE demo_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demo orgs accessible by demo session"
  ON demo_organizations
  FOR ALL
  USING (
    id IN (
      SELECT demo_org_id FROM demo_sessions
      WHERE session_token = current_setting('request.headers', true)::json->>'x-demo-token'
      AND expires_at > now()
    )
  );

-- デモ店舗テーブル
CREATE TABLE IF NOT EXISTS demo_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_org_id uuid NOT NULL REFERENCES demo_organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE demo_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demo stores accessible by demo session"
  ON demo_stores
  FOR ALL
  USING (
    demo_org_id IN (
      SELECT demo_org_id FROM demo_sessions
      WHERE session_token = current_setting('request.headers', true)::json->>'x-demo-token'
      AND expires_at > now()
    )
  );

-- デモ日報テーブル
CREATE TABLE IF NOT EXISTS demo_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_org_id uuid NOT NULL REFERENCES demo_organizations(id) ON DELETE CASCADE,
  demo_store_id uuid NOT NULL REFERENCES demo_stores(id) ON DELETE CASCADE,
  date date NOT NULL,
  sales numeric DEFAULT 0,
  customer_count integer DEFAULT 0,
  average_spend numeric DEFAULT 0,
  labor_cost numeric DEFAULT 0,
  food_cost numeric DEFAULT 0,
  rent numeric DEFAULT 0,
  utilities numeric DEFAULT 0,
  other_expenses numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(demo_store_id, date)
);

ALTER TABLE demo_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demo reports accessible by demo session"
  ON demo_reports
  FOR ALL
  USING (
    demo_org_id IN (
      SELECT demo_org_id FROM demo_sessions
      WHERE session_token = current_setting('request.headers', true)::json->>'x-demo-token'
      AND expires_at > now()
    )
  );

-- インデックス
CREATE INDEX IF NOT EXISTS idx_demo_sessions_token ON demo_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_expires ON demo_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_demo_stores_org ON demo_stores(demo_org_id);
CREATE INDEX IF NOT EXISTS idx_demo_reports_org ON demo_reports(demo_org_id);
CREATE INDEX IF NOT EXISTS idx_demo_reports_store ON demo_reports(demo_store_id);
CREATE INDEX IF NOT EXISTS idx_demo_reports_date ON demo_reports(date);

-- 期限切れデモセッション自動削除関数
CREATE OR REPLACE FUNCTION cleanup_expired_demo_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 期限切れから7日以上経過したセッションを削除
  DELETE FROM demo_sessions
  WHERE expires_at < now() - interval '7 days';
  
  -- 孤立したデモ組織を削除（セッションが存在しない組織）
  DELETE FROM demo_organizations
  WHERE id NOT IN (SELECT DISTINCT demo_org_id FROM demo_sessions);
END;
$$;

-- コメント
COMMENT ON TABLE demo_sessions IS 'デモセッション管理（14日間有効、本番環境と完全分離）';
COMMENT ON TABLE demo_organizations IS 'デモ専用組織データ';
COMMENT ON TABLE demo_stores IS 'デモ専用店舗データ';
COMMENT ON TABLE demo_reports IS 'デモ専用日報データ';
COMMENT ON FUNCTION cleanup_expired_demo_sessions IS '期限切れデモセッションの自動削除（定期実行推奨）';
