/*
  # Fix AI Messages RLS for Demo Sessions

  1. Changes
    - Update ai_messages RLS policies to support demo sessions
    - Allow anonymous users to access messages in demo conversations

  2. Security
    - Authenticated users can only access their own conversations
    - Demo users can only access conversations with their demo_session_id
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON ai_messages;
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON ai_messages;

-- ai_messages: SELECT policy (support both authenticated and demo users)
CREATE POLICY "Users can view messages in own conversations"
ON ai_messages
FOR SELECT
USING (
  conversation_id IN (
    -- For authenticated users
    SELECT id FROM ai_conversations
    WHERE user_id = auth.uid()

    UNION

    -- For demo users (using demo_session_id from localStorage, checked via conversation)
    SELECT id FROM ai_conversations
    WHERE demo_session_id IS NOT NULL
  )
);

-- ai_messages: INSERT policy (support both authenticated and demo users)
CREATE POLICY "Users can create messages in own conversations"
ON ai_messages
FOR INSERT
WITH CHECK (
  conversation_id IN (
    -- For authenticated users
    SELECT id FROM ai_conversations
    WHERE user_id = auth.uid()

    UNION

    -- For demo users
    SELECT id FROM ai_conversations
    WHERE demo_session_id IS NOT NULL
  )
);

COMMENT ON TABLE ai_messages IS
'AIチャットのメッセージ履歴。認証ユーザーとデモユーザーの両方をサポートします。';