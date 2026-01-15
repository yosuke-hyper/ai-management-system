/*
  # メンバー管理とスタッフ管理の統合 - 4階層権限システム

  ## 概要
  organization_membersとprofilesの権限システムを統一し、
  owner/admin/manager/staffの4階層権限体系を確立します。

  ## 1. 変更内容
    ### organization_members テーブル
    - role制約を (owner, admin, member) から (owner, admin, manager, staff) に変更
    - memberをstaffに置き換え

    ### profiles テーブル
    - role制約を (staff, manager, admin) から (owner, admin, manager, staff) に変更
    - 後方互換性を維持しつつ、organization_membersを優先する設計に

  ## 2. 新規ヘルパー関数
    - `is_organization_manager()` - manager以上の権限を持つか判定
    - `get_user_role_in_organization()` - ユーザーの組織内役割を取得

  ## 3. RLSポリシー更新
    - store_assignments: manager以上が店舗割り当てを管理可能に
    - 既存ポリシーをmanager権限に対応

  ## 4. データ移行
    - 既存のmemberをstaffに自動変換
    - profilesテーブルのrole値も整合性を保つ

  ## 5. 権限階層
    - owner: 組織の全権限（削除含む）
    - admin: メンバー管理、全店舗アクセス
    - manager: 店舗割り当て管理、割り当て店舗の管理
    - staff: 割り当て店舗のデータ入力のみ
*/

-- ============================================
-- 1. 既存データのバックアップと移行準備
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '🔄 Starting role system unification...';
END $$;

-- ============================================
-- 2. organization_members の役割を更新
-- ============================================

-- 制約を一時削除
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;

-- 既存の 'member' を 'staff' に変換
UPDATE public.organization_members
SET role = 'staff'
WHERE role = 'member';

-- 新しい4階層制約を追加
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'staff'));

COMMENT ON COLUMN public.organization_members.role IS 'owner: オーナー, admin: 管理者, manager: マネージャー, staff: スタッフ';

-- ============================================
-- 3. profiles の役割を更新
-- ============================================

-- 制約を一時削除
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 新しい4階層制約を追加
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'staff'));

COMMENT ON COLUMN public.profiles.role IS '※非推奨: organization_members.roleを使用してください。owner: オーナー, admin: 管理者, manager: マネージャー, staff: スタッフ';

-- ============================================
-- 4. 新規ヘルパー関数の作成
-- ============================================

-- ユーザーの組織内役割を取得する関数
CREATE OR REPLACE FUNCTION public.get_user_role_in_organization(org_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role::text
  FROM public.organization_members
  WHERE user_id = auth.uid()
    AND (org_id IS NULL OR organization_id = org_id)
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_role_in_organization(uuid) IS 'ユーザーの組織内での役割を取得（owner/admin/manager/staff）';

-- manager以上の権限を持つか判定
CREATE OR REPLACE FUNCTION public.is_organization_manager(org_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = auth.uid()
      AND (org_id IS NULL OR organization_id = org_id)
      AND role IN ('owner', 'admin', 'manager')
  );
$$;

COMMENT ON FUNCTION public.is_organization_manager(uuid) IS 'ユーザーがmanager以上の権限を持つか判定';

-- is_organization_admin関数を更新（owner/adminのみ）
-- Note: CASCADE is not needed, just replace the function
CREATE OR REPLACE FUNCTION public.is_organization_admin(org_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = auth.uid()
      AND (org_id IS NULL OR organization_id = org_id)
      AND role IN ('owner', 'admin')
  );
$$;

COMMENT ON FUNCTION public.is_organization_admin(uuid) IS 'ユーザーがadmin以上の権限を持つか判定（owner/adminのみ）';

-- ============================================
-- 5. store_assignments RLSポリシーの更新
-- ============================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Admins can manage store assignments" ON public.store_assignments;
DROP POLICY IF EXISTS "Users can read own store assignments" ON public.store_assignments;

-- manager以上が全ての店舗割り当てを閲覧可能
CREATE POLICY "Managers can view all store assignments"
  ON public.store_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'manager')
    )
    OR user_id = auth.uid()
  );

-- manager以上が店舗割り当てを追加可能
CREATE POLICY "Managers can add store assignments"
  ON public.store_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'manager')
    )
  );

-- manager以上が店舗割り当てを削除可能
CREATE POLICY "Managers can remove store assignments"
  ON public.store_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'manager')
    )
  );

-- ============================================
-- 6. organization_members RLSポリシーの更新
-- ============================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Admins can update members" ON public.organization_members;

-- admin以上がメンバーの役割を更新可能（owner以外）
CREATE POLICY "Admins can update members"
  ON public.organization_members
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
    AND role != 'owner'
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
    AND role != 'owner'
  );

-- ============================================
-- 7. profiles テーブルのRLSポリシー更新
-- ============================================

-- 既存のポリシーを削除して再作成
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can read member profiles" ON public.profiles;

-- 自分のプロフィールは常に閲覧可能
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- admin以上は全メンバーのプロフィールを閲覧可能
CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- manager以上は同じ組織のメンバーのプロフィールを閲覧可能
CREATE POLICY "Managers can read member profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT om1.user_id
      FROM public.organization_members om1
      WHERE om1.organization_id IN (
        SELECT om2.organization_id
        FROM public.organization_members om2
        WHERE om2.user_id = auth.uid()
          AND om2.role IN ('owner', 'admin', 'manager')
      )
    )
  );

-- ============================================
-- 8. インデックスの追加（パフォーマンス向上）
-- ============================================

CREATE INDEX IF NOT EXISTS idx_organization_members_role_user
  ON public.organization_members (role, user_id);

CREATE INDEX IF NOT EXISTS idx_store_assignments_user_store
  ON public.store_assignments (user_id, store_id);

-- ============================================
-- 9. 完了メッセージ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Role system unification completed';
  RAISE NOTICE '✅ organization_members: member → staff conversion done';
  RAISE NOTICE '✅ New 4-tier role system: owner, admin, manager, staff';
  RAISE NOTICE '✅ Helper functions created: is_organization_manager(), get_user_role_in_organization()';
  RAISE NOTICE '✅ RLS policies updated for manager access to store assignments';
  RAISE NOTICE '📋 Next: Update frontend to use unified role system';
END $$;
