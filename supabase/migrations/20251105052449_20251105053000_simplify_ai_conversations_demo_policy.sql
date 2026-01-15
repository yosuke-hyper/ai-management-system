/*
  # Simplify AI Conversations Demo Policy

  1. Changes
    - Simplify INSERT policy for ai_conversations to allow demo users
    - Remove complex demo_sessions validation that blocks anonymous users

  2. Security
    - Authenticated users: can create conversations with their user_id
    - Anonymous demo users: can create conversations with any demo_session_id
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create own conversations" ON ai_conversations;

-- Create simplified INSERT policy
CREATE POLICY "Users can create own conversations"
ON ai_conversations
FOR INSERT
TO authenticated, anon
WITH CHECK (
  -- For authenticated users: user_id must match auth.uid()
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  -- For anonymous demo users: allow if demo_session_id is provided
  (auth.uid() IS NULL AND demo_session_id IS NOT NULL)
);
