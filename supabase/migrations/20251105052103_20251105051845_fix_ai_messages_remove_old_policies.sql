/*
  # Remove Old AI Messages Policies

  1. Changes
    - Remove old organization-based RLS policies that conflict with demo support
    - Keep only the new policies that support both authenticated and demo users

  2. Reason
    - Old policies checking organization_id prevent demo users from inserting messages
    - Multiple policies with same command type can cause conflicts
*/

-- Remove old organization-based policies that conflict
DROP POLICY IF EXISTS "ai_messages_select" ON ai_messages;
DROP POLICY IF EXISTS "ai_messages_insert" ON ai_messages;
DROP POLICY IF EXISTS "ai_messages_update" ON ai_messages;
DROP POLICY IF EXISTS "ai_messages_delete" ON ai_messages;

-- The correct policies are already in place from previous migration:
-- "Users can view messages in own conversations" - for SELECT
-- "Users can create messages in own conversations" - for INSERT
