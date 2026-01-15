/*
  # Fix AI Conversations for Demo Users

  1. Changes
    - Make user_id nullable to support demo users
    - Remove foreign key constraint on user_id (demo users don't have auth.users records)
    - Add check constraint to ensure either user_id or demo_session_id is present

  2. Security
    - Maintain RLS policies that check both authenticated users and demo sessions
*/

-- Drop the foreign key constraint on user_id
ALTER TABLE ai_conversations
DROP CONSTRAINT IF EXISTS ai_conversations_user_id_fkey;

-- Make user_id nullable
ALTER TABLE ai_conversations
ALTER COLUMN user_id DROP NOT NULL;

-- Add check constraint to ensure either user_id or demo_session_id exists
ALTER TABLE ai_conversations
ADD CONSTRAINT ai_conversations_user_or_demo_check
CHECK (
  (user_id IS NOT NULL AND demo_session_id IS NULL) OR
  (user_id IS NULL AND demo_session_id IS NOT NULL)
);

-- Update the comment
COMMENT ON TABLE ai_conversations IS
'AIチャットの会話スレッド。認証ユーザーの場合はuser_idを使用、デモユーザーの場合はdemo_session_idを使用します。';
