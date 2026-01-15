/*
  # 通知システムの作成

  ## 変更内容
  
  1. テーブル作成
    - `notifications` テーブル
      - `id` (uuid, primary key)
      - `organization_id` (uuid, FK to organizations)
      - `user_id` (uuid, FK to auth.users)
      - `type` (text) - success, warning, error, info
      - `title` (text) - 通知タイトル
      - `message` (text) - 通知メッセージ
      - `link` (text, nullable) - 関連リンク
      - `read` (boolean) - 既読フラグ
      - `read_at` (timestamptz, nullable) - 既読日時
      - `created_at` (timestamptz) - 作成日時
      - `expires_at` (timestamptz, nullable) - 有効期限
  
  2. セキュリティ
    - RLS有効化
    - ユーザーは自分の組織の自分宛の通知のみ閲覧可能
    - 自分の通知のみ既読にできる
    - 管理者は組織内の全ユーザーに通知を作成可能
  
  3. インデックス
    - ユーザーID
    - 組織ID
    - 既読フラグ
    - 作成日時
*/

-- ============================================
-- 1. 通知テーブルの作成
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('success', 'warning', 'error', 'info')),
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

-- ============================================
-- 2. インデックスの作成
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;

-- ============================================
-- 3. RLSポリシーの設定
-- ============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: ユーザーは自分宛の通知のみ閲覧可能
CREATE POLICY "Users can view own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: 管理者は組織内のユーザーに通知を作成可能
-- またはシステムが自動的に通知を作成
CREATE POLICY "Admins can create notifications for org members"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- 管理者が自分の組織のメンバーに通知を送る
  EXISTS (
    SELECT 1
    FROM organization_members om
    INNER JOIN profiles p ON p.id = om.user_id
    WHERE om.organization_id = notifications.organization_id
    AND om.user_id = auth.uid()
    AND p.role = 'admin'
  )
  OR
  -- 自分自身への通知（システム通知）
  user_id = auth.uid()
);

-- UPDATE: ユーザーは自分の通知の既読状態のみ更新可能
CREATE POLICY "Users can update own notification read status"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: ユーザーは自分の通知を削除可能
CREATE POLICY "Users can delete own notifications"
ON notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- 4. 期限切れ通知の自動削除関数
-- ============================================

CREATE OR REPLACE FUNCTION delete_expired_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM notifications
  WHERE expires_at IS NOT NULL
  AND expires_at < now();
END;
$$;

-- ============================================
-- 5. 通知作成ヘルパー関数
-- ============================================

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_organization_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL,
  p_expires_days integer DEFAULT 30
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications (
    user_id,
    organization_id,
    type,
    title,
    message,
    link,
    expires_at
  ) VALUES (
    p_user_id,
    p_organization_id,
    p_type,
    p_title,
    p_message,
    p_link,
    CASE WHEN p_expires_days IS NOT NULL THEN now() + (p_expires_days || ' days')::interval ELSE NULL END
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;
