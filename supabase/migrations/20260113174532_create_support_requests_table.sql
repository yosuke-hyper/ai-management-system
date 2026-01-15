/*
  # サポートリクエストテーブルの作成

  1. 新しいテーブル
    - `support_requests`
      - `id` (uuid, primary key) - リクエストID
      - `user_id` (uuid, nullable) - ユーザーID（未ログインユーザーの場合はnull）
      - `email` (text) - 送信者メールアドレス
      - `subject` (text) - 件名
      - `category` (text) - カテゴリ（general, technical, billing, feature, bug）
      - `message` (text) - お問い合わせ内容
      - `status` (text) - ステータス（open, in_progress, closed）
      - `created_at` (timestamptz) - 作成日時
      - `updated_at` (timestamptz) - 更新日時

  2. セキュリティ
    - RLSを有効化
    - 認証済みユーザーは自分のリクエストを作成・閲覧可能
    - 匿名ユーザーもリクエストを作成可能（お問い合わせフォーム用）
    - スーパー管理者はすべてのリクエストを閲覧・更新可能
*/

-- support_requestsテーブルを作成
CREATE TABLE IF NOT EXISTS support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_support_requests_user_id ON support_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_requests_created_at ON support_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_requests_email ON support_requests(email);

-- RLSを有効化
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- 匿名ユーザーもリクエストを挿入可能（お問い合わせフォーム用）
CREATE POLICY "Anyone can create support requests"
  ON support_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 認証済みユーザーは自分のリクエストを閲覧可能
CREATE POLICY "Users can view own support requests"
  ON support_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- スーパー管理者はすべてのリクエストを閲覧可能
CREATE POLICY "Super admins can view all support requests"
  ON support_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE system_admins.user_id = auth.uid()
      AND system_admins.is_active = true
    )
  );

-- スーパー管理者はリクエストを更新可能（ステータス変更など）
CREATE POLICY "Super admins can update support requests"
  ON support_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE system_admins.user_id = auth.uid()
      AND system_admins.is_active = true
    )
  );

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_support_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_requests_updated_at
  BEFORE UPDATE ON support_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_support_requests_updated_at();
