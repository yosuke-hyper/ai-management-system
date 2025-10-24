/*
  # AIチャット履歴アーカイブ機能

  ## 概要
  AIチャットの会話履歴を保存・検索・アーカイブできる機能を追加します。
  ページリロードしても会話が復元され、過去のやり取りを検索できます。

  ## 新規テーブル

  ### ai_conversations（会話テーブル）
  - `id` (uuid, primary key) - 会話ID
  - `user_id` (uuid) - ユーザーID
  - `store_id` (text) - 店舗ID（'all' または 'store-xxx'）
  - `title` (text) - 会話タイトル（初回メッセージから自動生成）
  - `archived` (boolean) - アーカイブ済みフラグ
  - `created_at` (timestamptz) - 作成日時
  - `updated_at` (timestamptz) - 更新日時

  ### ai_messages（メッセージテーブル）
  - `id` (uuid, primary key) - メッセージID
  - `conversation_id` (uuid) - 会話ID（外部キー）
  - `role` (text) - 役割（system/user/assistant）
  - `content` (text) - メッセージ内容
  - `tokens` (int) - トークン数（コスト管理用）
  - `meta` (jsonb) - メタデータ（usage情報など）
  - `created_at` (timestamptz) - 作成日時

  ## セキュリティ
  - RLS有効化
  - ユーザーは自分の会話とメッセージのみアクセス可能

  ## パフォーマンス最適化
  - pg_trgm拡張による全文検索インデックス
  - 会話一覧用の複合インデックス
  - メッセージ取得用のインデックス
*/

-- ============================================
-- 1. 拡張機能の有効化
-- ============================================

-- 文字列検索の精度向上（日本語もtrigramでOK）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- 2. ai_conversations テーブル
-- ============================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id text,
  title text,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 3. ai_messages テーブル
-- ============================================

CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('system','user','assistant')),
  content text NOT NULL,
  tokens int,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 4. インデックス
-- ============================================

-- 会話一覧用（ユーザー別・アーカイブ別・更新日時降順）
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user 
ON ai_conversations(user_id, archived, updated_at DESC);

-- 会話別メッセージ取得用（会話ID・作成日時昇順）
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv 
ON ai_messages(conversation_id, created_at);

-- 全文検索用（trigram GINインデックス）
CREATE INDEX IF NOT EXISTS idx_ai_messages_trgm 
ON ai_messages USING gin (content gin_trgm_ops);

-- ユーザー別メッセージ検索用（結合最適化）
CREATE INDEX IF NOT EXISTS idx_ai_messages_user 
ON ai_messages(conversation_id);

-- ============================================
-- 5. Row Level Security（RLS）
-- ============================================

-- ai_conversations のRLS有効化
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- ai_messages のRLS有効化
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- ai_conversations: SELECT ポリシー
DROP POLICY IF EXISTS "Users can view own conversations" ON ai_conversations;
CREATE POLICY "Users can view own conversations" 
ON ai_conversations
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- ai_conversations: INSERT ポリシー
DROP POLICY IF EXISTS "Users can create own conversations" ON ai_conversations;
CREATE POLICY "Users can create own conversations" 
ON ai_conversations
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ai_conversations: UPDATE ポリシー
DROP POLICY IF EXISTS "Users can update own conversations" ON ai_conversations;
CREATE POLICY "Users can update own conversations" 
ON ai_conversations
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ai_conversations: DELETE ポリシー
DROP POLICY IF EXISTS "Users can delete own conversations" ON ai_conversations;
CREATE POLICY "Users can delete own conversations" 
ON ai_conversations
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- ai_messages: SELECT ポリシー
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON ai_messages;
CREATE POLICY "Users can view messages in own conversations" 
ON ai_messages
FOR SELECT 
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM ai_conversations WHERE user_id = auth.uid()
  )
);

-- ai_messages: INSERT ポリシー
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON ai_messages;
CREATE POLICY "Users can create messages in own conversations" 
ON ai_messages
FOR INSERT 
TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT id FROM ai_conversations WHERE user_id = auth.uid()
  )
);

-- ============================================
-- 6. 検索用RPC関数
-- ============================================

-- メッセージ全文検索関数
CREATE OR REPLACE FUNCTION ai_search_messages(q text)
RETURNS TABLE(
  conversation_id uuid,
  snippet text,
  created_at timestamptz
) 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.conversation_id,
    LEFT(m.content, 160) AS snippet,
    m.created_at
  FROM ai_messages m
  JOIN ai_conversations c ON c.id = m.conversation_id
  WHERE c.user_id = auth.uid()
    AND m.content ILIKE '%' || q || '%'
  ORDER BY m.created_at DESC
  LIMIT 200;
$$;

-- ============================================
-- 7. トリガー関数（updated_at自動更新）
-- ============================================

-- updated_at自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ai_conversations用トリガー
DROP TRIGGER IF EXISTS trigger_ai_conversations_updated_at ON ai_conversations;
CREATE TRIGGER trigger_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. テーブルコメント
-- ============================================

COMMENT ON TABLE ai_conversations IS 
'AIチャットの会話スレッド。ユーザーごとに複数の会話を保持できます。';

COMMENT ON TABLE ai_messages IS 
'AIチャットのメッセージ履歴。会話ごとにメッセージを保存します。';

COMMENT ON FUNCTION ai_search_messages IS 
'メッセージ内容を全文検索する関数。ユーザー自身の会話のみ検索対象。
使用例: SELECT * FROM ai_search_messages(''売上分析'');';

-- ============================================
-- 9. サンプルデータ（開発用・任意）
-- ============================================

-- 開発環境用のサンプルデータ挿入は任意
-- 本番環境では不要なので、コメントアウトしておきます

/*
-- サンプル会話を作成（テスト用）
INSERT INTO ai_conversations (user_id, store_id, title, archived)
SELECT 
  id, 
  'all', 
  'サンプル会話：システム概要',
  false
FROM auth.users 
LIMIT 1
ON CONFLICT DO NOTHING;
*/
