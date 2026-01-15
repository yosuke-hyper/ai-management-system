/*
  # Simplify All AI Conversations Policies for Demo Mode

  1. Changes
    - Simplify SELECT policy to allow anonymous demo users without complex validation
    - Simplify UPDATE policy for demo users
    - Simplify DELETE policy for demo users

  2. Security
    - Authenticated users: can access their own conversations (user_id = auth.uid())
    - Anonymous demo users: can access conversations with demo_session_id set
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON ai_conversations;

-- SELECT policy: Allow both authenticated and anonymous demo users
CREATE POLICY "Users can view own conversations"
ON ai_conversations
FOR SELECT
TO authenticated, anon
USING (
  -- Authenticated users: check user_id
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  -- Anonymous demo users: allow if demo_session_id is set
  (auth.uid() IS NULL AND demo_session_id IS NOT NULL)
);

-- UPDATE policy: Allow both authenticated and anonymous demo users
CREATE POLICY "Users can update own conversations"
ON ai_conversations
FOR UPDATE
TO authenticated, anon
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  (auth.uid() IS NULL AND demo_session_id IS NOT NULL)
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  (auth.uid() IS NULL AND demo_session_id IS NOT NULL)
);

-- DELETE policy: Allow both authenticated and anonymous demo users
CREATE POLICY "Users can delete own conversations"
ON ai_conversations
FOR DELETE
TO authenticated, anon
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  (auth.uid() IS NULL AND demo_session_id IS NOT NULL)
);
