/*
  # 役割チェック用ヘルパー関数の作成

  1. 目的
    - 役割ベースのRLSポリシーでも無限再帰を回避
    - SECURITY DEFINER関数でRLSをバイパス

  2. 作成する関数
    - is_org_admin_or_manager(org_id uuid): 管理者またはマネージャーか
    - is_org_owner_admin_manager(org_id uuid): オーナー、管理者、マネージャーか
    - get_user_role_in_org(org_id uuid): ユーザーの役割を取得
*/

-- ユーザーが指定組織の管理者またはマネージャーか
CREATE OR REPLACE FUNCTION public.is_org_admin_or_manager(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
      AND organization_id = org_id
      AND role IN ('owner', 'admin', 'manager')
  );
$$;

COMMENT ON FUNCTION public.is_org_admin_or_manager(uuid) IS 'Check if user is admin or manager in organization, bypassing RLS';

-- ユーザーが指定組織のオーナー、管理者、マネージャーか
CREATE OR REPLACE FUNCTION public.is_org_owner_admin_manager(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
      AND organization_id = org_id
      AND role IN ('owner', 'admin', 'manager')
  );
$$;

COMMENT ON FUNCTION public.is_org_owner_admin_manager(uuid) IS 'Check if user is owner, admin or manager in organization, bypassing RLS';

-- ユーザーが指定組織のオーナーまたは管理者か
CREATE OR REPLACE FUNCTION public.is_org_owner_or_admin(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
      AND organization_id = org_id
      AND role IN ('owner', 'admin')
  );
$$;

COMMENT ON FUNCTION public.is_org_owner_or_admin(uuid) IS 'Check if user is owner or admin in organization, bypassing RLS';

-- ストアの組織IDを取得する関数
CREATE OR REPLACE FUNCTION public.get_store_organization_id(store_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id FROM stores WHERE id = store_id;
$$;

COMMENT ON FUNCTION public.get_store_organization_id(uuid) IS 'Get organization ID for a store, bypassing RLS';
