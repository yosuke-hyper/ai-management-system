/*
  # 見積依頼テーブルの作成

  ## 新しいテーブル

  ### `quote_requests`
  - `id` (uuid, primary key) - 見積依頼ID
  - `organization_name` (text) - 組織名
  - `contact_name` (text) - 担当者名
  - `email` (text) - メールアドレス
  - `phone` (text, nullable) - 電話番号
  - `store_count` (integer) - 利用予定店舗数
  - `message` (text, nullable) - お問い合わせ内容
  - `status` (text) - ステータス（pending, contacted, quoted, closed）
  - `created_at` (timestamptz) - 作成日時
  - `updated_at` (timestamptz) - 更新日時

  ## セキュリティ
  - RLSを有効化
  - 管理者のみが全ての見積依頼を閲覧・管理可能
  - 匿名ユーザーでも見積依頼を作成可能（フォーム送信用）

  ## 注意事項
  1. 5店舗以上の導入を検討する組織からの見積依頼を管理
  2. ステータス管理により営業プロセスを追跡
  3. 個人情報を含むため、適切なRLS設定が必須
*/

-- quote_requests テーブル作成
CREATE TABLE IF NOT EXISTS quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  store_count integer NOT NULL CHECK (store_count >= 5),
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'quoted', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at ON quote_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_requests_email ON quote_requests(email);

-- RLS有効化
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

-- 匿名ユーザーが見積依頼を作成できるポリシー
DROP POLICY IF EXISTS "Anyone can create quote request" ON quote_requests;
CREATE POLICY "Anyone can create quote request"
  ON quote_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 管理者が全ての見積依頼を閲覧できるポリシー
DROP POLICY IF EXISTS "Admins can view all quote requests" ON quote_requests;
CREATE POLICY "Admins can view all quote requests"
  ON quote_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 管理者が見積依頼を更新できるポリシー
DROP POLICY IF EXISTS "Admins can update quote requests" ON quote_requests;
CREATE POLICY "Admins can update quote requests"
  ON quote_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 管理者が見積依頼を削除できるポリシー
DROP POLICY IF EXISTS "Admins can delete quote requests" ON quote_requests;
CREATE POLICY "Admins can delete quote requests"
  ON quote_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- updated_at自動更新トリガー
DROP TRIGGER IF EXISTS update_quote_requests_updated_at ON quote_requests;
CREATE TRIGGER update_quote_requests_updated_at
  BEFORE UPDATE ON quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
