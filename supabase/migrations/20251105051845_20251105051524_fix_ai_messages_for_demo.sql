/*
  # Fix AI Messages RLS for Demo Sessions (Corrected)

  1. Changes
    - Update ai_messages RLS policies to support anonymous demo users
    - Allow both authenticated users and anonymous (demo) users to access their messages
    - Use TO authenticated, anon to include anonymous users

  2. Security
    - Authenticated users can only access their own conversations
    - Anonymous demo users can only access conversations with valid demo_session_id
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON ai_messages;
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON ai_messages;

-- ai_messages: SELECT policy (support both authenticated and anonymous demo users)
CREATE POLICY "Users can view messages in own conversations"
ON ai_messages
FOR SELECT
TO authenticated, anon
USING (
  -- For authenticated users: check user_id in conversation
  (auth.uid() IS NOT NULL AND conversation_id IN (
    SELECT id FROM ai_conversations WHERE user_id = auth.uid()
  ))
  OR
  -- For anonymous demo users: allow access to any demo conversation
  (auth.uid() IS NULL AND conversation_id IN (
    SELECT id FROM ai_conversations WHERE demo_session_id IS NOT NULL
  ))
);

-- ai_messages: INSERT policy (support both authenticated and anonymous demo users)
CREATE POLICY "Users can create messages in own conversations"
ON ai_messages
FOR INSERT
TO authenticated, anon
WITH CHECK (
  -- For authenticated users: check user_id in conversation
  (auth.uid() IS NOT NULL AND conversation_id IN (
    SELECT id FROM ai_conversations WHERE user_id = auth.uid()
  ))
  OR
  -- For anonymous demo users: allow creating messages in demo conversations
  (auth.uid() IS NULL AND conversation_id IN (
    SELECT id FROM ai_conversations WHERE demo_session_id IS NOT NULL
  ))
);

COMMENT ON TABLE ai_messages IS
'AIチャットのメッセージ履歴。認証ユーザーとデモユーザー（匿名）の両方をサポートします。';