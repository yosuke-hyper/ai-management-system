/*
  # Remove Old AI Conversations Policies

  1. Changes
    - Remove old organization-based RLS policies that conflict with demo support
    - Keep only the new policies that support both authenticated and demo users

  2. Reason
    - Old policies checking organization_id prevent demo users from creating conversations
    - Multiple policies with same command type can cause conflicts
*/

-- Remove old organization-based policies for ai_conversations
DROP POLICY IF EXISTS "ai_conversations_select" ON ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_insert" ON ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_update" ON ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_delete" ON ai_conversations;

-- The correct policies are already in place from previous migrations:
-- "Users can view own conversations" - for SELECT
-- "Users can create own conversations" - for INSERT
-- "Users can update own conversations" - for UPDATE
-- "Users can delete own conversations" - for DELETE
