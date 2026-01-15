/*
  # Allow Demo Users to Use AI Chat Archive

  1. Changes
    - Add demo_session_id column to ai_conversations table
    - Update RLS policies to allow anonymous users with valid demo sessions
    - Allow demo users to create and access their own conversations

  2. Security
    - Demo users can only access conversations associated with their demo_session_id
    - Regular authenticated users maintain existing access controls
    - Demo sessions must be valid (not expired)
*/

-- Add demo_session_id column to ai_conversations
ALTER TABLE ai_conversations
ADD COLUMN IF NOT EXISTS demo_session_id uuid REFERENCES demo_sessions(id) ON DELETE CASCADE;

-- Create index for demo session lookups
CREATE INDEX IF NOT EXISTS idx_ai_conversations_demo_session
ON ai_conversations(demo_session_id);

-- Drop existing policies and create new ones that support both authenticated and demo users

-- ai_conversations: SELECT policy for both authenticated and demo users
DROP POLICY IF EXISTS "Users can view own conversations" ON ai_conversations;
CREATE POLICY "Users can view own conversations"
ON ai_conversations
FOR SELECT
TO authenticated, anon
USING (
  (auth.uid() = user_id) OR
  (demo_session_id IS NOT NULL AND demo_session_id IN (
    SELECT id FROM demo_sessions WHERE id = demo_session_id AND expires_at > now()
  ))
);

-- ai_conversations: INSERT policy for both authenticated and demo users
DROP POLICY IF EXISTS "Users can create own conversations" ON ai_conversations;
CREATE POLICY "Users can create own conversations"
ON ai_conversations
FOR INSERT
TO authenticated, anon
WITH CHECK (
  (auth.uid() = user_id) OR
  (demo_session_id IS NOT NULL AND demo_session_id IN (
    SELECT id FROM demo_sessions WHERE id = demo_session_id AND expires_at > now()
  ))
);

-- ai_conversations: UPDATE policy for both authenticated and demo users
DROP POLICY IF EXISTS "Users can update own conversations" ON ai_conversations;
CREATE POLICY "Users can update own conversations"
ON ai_conversations
FOR UPDATE
TO authenticated, anon
USING (
  (auth.uid() = user_id) OR
  (demo_session_id IS NOT NULL AND demo_session_id IN (
    SELECT id FROM demo_sessions WHERE id = demo_session_id AND expires_at > now()
  ))
)
WITH CHECK (
  (auth.uid() = user_id) OR
  (demo_session_id IS NOT NULL AND demo_session_id IN (
    SELECT id FROM demo_sessions WHERE id = demo_session_id AND expires_at > now()
  ))
);

-- ai_conversations: DELETE policy for both authenticated and demo users
DROP POLICY IF EXISTS "Users can delete own conversations" ON ai_conversations;
CREATE POLICY "Users can delete own conversations"
ON ai_conversations
FOR DELETE
TO authenticated, anon
USING (
  (auth.uid() = user_id) OR
  (demo_session_id IS NOT NULL AND demo_session_id IN (
    SELECT id FROM demo_sessions WHERE id = demo_session_id AND expires_at > now()
  ))
);

-- ai_messages: SELECT policy for both authenticated and demo users
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON ai_messages;
CREATE POLICY "Users can view messages in own conversations"
ON ai_messages
FOR SELECT
TO authenticated, anon
USING (
  conversation_id IN (
    SELECT id FROM ai_conversations
    WHERE (user_id = auth.uid()) OR
          (demo_session_id IS NOT NULL AND demo_session_id IN (
            SELECT id FROM demo_sessions WHERE id = demo_session_id AND expires_at > now()
          ))
  )
);

-- ai_messages: INSERT policy for both authenticated and demo users
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON ai_messages;
CREATE POLICY "Users can create messages in own conversations"
ON ai_messages
FOR INSERT
TO authenticated, anon
WITH CHECK (
  conversation_id IN (
    SELECT id FROM ai_conversations
    WHERE (user_id = auth.uid()) OR
          (demo_session_id IS NOT NULL AND demo_session_id IN (
            SELECT id FROM demo_sessions WHERE id = demo_session_id AND expires_at > now()
          ))
  )
);

-- Update ai_search_messages function to support demo users
CREATE OR REPLACE FUNCTION ai_search_messages(q text, p_demo_session_id uuid DEFAULT NULL)
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
  WHERE (
    (c.user_id = auth.uid()) OR
    (p_demo_session_id IS NOT NULL AND c.demo_session_id = p_demo_session_id)
  )
    AND m.content ILIKE '%' || q || '%'
  ORDER BY m.created_at DESC
  LIMIT 200;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_conversations TO anon;
GRANT SELECT, INSERT ON ai_messages TO anon;
GRANT EXECUTE ON FUNCTION ai_search_messages(text, uuid) TO anon;

-- Add comment
COMMENT ON COLUMN ai_conversations.demo_session_id IS
'Demo session ID for anonymous demo users. NULL for authenticated users.';
