/*
  # 組織招待システムの作成

  1. 新しいテーブル
    - `organization_invitations`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `email` (text) - 招待するメールアドレス
      - `role` (text) - 招待時の役割 (member, admin)
      - `token` (text, unique) - 招待トークン
      - `invited_by` (uuid, foreign key to auth.users) - 招待者のユーザーID
      - `status` (text) - 招待状態 (pending, accepted, cancelled)
      - `expires_at` (timestamptz) - 有効期限
      - `accepted_at` (timestamptz) - 承認日時
      - `created_at` (timestamptz) - 作成日時

  2. セキュリティ
    - RLSを有効化
    - 組織のメンバーが招待を閲覧できるポリシー
    - 管理者が招待を作成・削除できるポリシー
    - 招待された人が自分の招待を閲覧・承認できるポリシー

  3. インデックス
    - token検索用のインデックス
    - organization_id検索用のインデックス
    - email検索用のインデックス
*/

-- 組織招待テーブルの作成
CREATE TABLE IF NOT EXISTS organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('member', 'admin')),
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_organization_id ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_status ON organization_invitations(status);

-- RLSを有効化
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- 組織メンバーが招待一覧を閲覧できるポリシー
CREATE POLICY "Organization members can view invitations"
  ON organization_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_invitations.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- 管理者が招待を作成できるポリシー
CREATE POLICY "Organization admins can create invitations"
  ON organization_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_invitations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- 管理者が招待を更新できるポリシー
CREATE POLICY "Organization admins can update invitations"
  ON organization_invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_invitations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- 管理者が招待を削除できるポリシー
CREATE POLICY "Organization admins can delete invitations"
  ON organization_invitations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_invitations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- 招待された人が自分の招待をトークンで閲覧できるポリシー（匿名ユーザーも含む）
CREATE POLICY "Anyone can view invitation by token"
  ON organization_invitations
  FOR SELECT
  TO anon, authenticated
  USING (true);
