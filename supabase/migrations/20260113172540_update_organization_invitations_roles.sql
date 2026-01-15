/*
  # 組織招待の役割を4段階に更新

  1. 変更内容
    - `organization_invitations`テーブルの`role`カラムの制約を更新
    - 'member', 'admin'から'owner', 'admin', 'manager', 'staff'の4段階に変更

  2. 注意事項
    - 既存のデータとの互換性を確保するため、'member'は'staff'として扱う
    - 'admin'はそのまま維持
*/

-- 既存の制約を削除
ALTER TABLE organization_invitations 
  DROP CONSTRAINT IF EXISTS organization_invitations_role_check;

-- 新しい制約を追加（4段階の役割）
ALTER TABLE organization_invitations 
  ADD CONSTRAINT organization_invitations_role_check 
  CHECK (role IN ('owner', 'admin', 'manager', 'staff'));
