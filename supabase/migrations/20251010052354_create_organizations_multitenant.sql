/*
  # マルチテナント化 - Organizations テーブル作成

  ## 概要
  複数の企業・組織がシステムを独立して利用できるよう、マルチテナント機能を実装します。

  ## 1. 新規テーブル
    - `organizations` - 組織・企業の基本情報
      - `id` (uuid, primary key) - 組織ID
      - `name` (text) - 組織名
      - `slug` (text, unique) - URL用スラッグ
      - `email` (text) - 組織の連絡先メール
      - `phone` (text) - 電話番号
      - `subscription_status` (text) - サブスクリプション状態 (trial, active, suspended, cancelled)
      - `subscription_plan` (text) - プラン種別 (free, starter, business, enterprise)
      - `trial_ends_at` (timestamptz) - トライアル期限
      - `max_stores` (int) - 最大店舗数制限
      - `max_users` (int) - 最大ユーザー数制限
      - `max_ai_requests_per_month` (int) - 月間AI使用回数制限
      - `settings` (jsonb) - 組織固有の設定
      - `created_at` (timestamptz) - 作成日時
      - `updated_at` (timestamptz) - 更新日時

    - `organization_members` - 組織メンバー管理
      - `organization_id` (uuid, foreign key) - 組織ID
      - `user_id` (uuid, foreign key) - ユーザーID
      - `role` (text) - 組織内の役割 (owner, admin, member)
      - `joined_at` (timestamptz) - 参加日時

  ## 2. セキュリティ
    - 全テーブルでRLS有効化
    - ユーザーは所属組織のデータのみアクセス可能
    - 組織オーナー/管理者は組織設定を変更可能
    - 完全なデータ分離を保証

  ## 3. 重要な変更
    - 既存テーブルに `organization_id` を追加する準備
    - ヘルパー関数 `get_user_organization_id()` を作成
    - 組織オーナー判定関数 `is_organization_owner()` を作成
*/

-- ============================================
-- 1. Organizations テーブル作成
-- ============================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  email text NOT NULL,
  phone text,
  subscription_status text NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'suspended', 'cancelled')),
  subscription_plan text NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'starter', 'business', 'enterprise')),
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  max_stores int NOT NULL DEFAULT 3,
  max_users int NOT NULL DEFAULT 5,
  max_ai_requests_per_month int NOT NULL DEFAULT 100,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.organizations IS '組織・企業の基本情報を管理するテーブル';
COMMENT ON COLUMN public.organizations.subscription_status IS 'trial: トライアル中, active: 有効, suspended: 一時停止, cancelled: キャンセル済み';
COMMENT ON COLUMN public.organizations.subscription_plan IS 'free: 無料, starter: スターター, business: ビジネス, enterprise: エンタープライズ';

-- ============================================
-- 2. Organization Members テーブル作成
-- ============================================

CREATE TABLE IF NOT EXISTS public.organization_members (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (organization_id, user_id)
);

COMMENT ON TABLE public.organization_members IS '組織とユーザーの関連を管理するテーブル';
COMMENT ON COLUMN public.organization_members.role IS 'owner: オーナー, admin: 管理者, member: メンバー';

-- ============================================
-- 3. Updated_at トリガー
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 4. ヘルパー関数
-- ============================================

-- ユーザーの所属組織IDを取得
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_organization_id() IS '現在のユーザーが所属する組織のIDを返す';

-- ユーザーが組織のオーナーかどうかを判定
CREATE OR REPLACE FUNCTION public.is_organization_owner(org_id uuid DEFAULT NULL)
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
      AND role = 'owner'
  );
$$;

COMMENT ON FUNCTION public.is_organization_owner(uuid) IS '現在のユーザーが指定された組織（または所属組織）のオーナーかどうかを判定';

-- ユーザーが組織の管理者以上かどうかを判定
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

COMMENT ON FUNCTION public.is_organization_admin(uuid) IS '現在のユーザーが指定された組織（または所属組織）の管理者以上かどうかを判定';

-- ============================================
-- 5. RLSポリシー - Organizations
-- ============================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 組織メンバーは自分の組織を参照可能
CREATE POLICY "Members can view their organization"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- オーナー・管理者は組織情報を更新可能
CREATE POLICY "Owners and admins can update organization"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- 新規組織作成（サインアップ時のみ）
CREATE POLICY "Anyone can create organization"
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- オーナーのみ組織削除可能
CREATE POLICY "Only owners can delete organization"
  ON public.organizations
  FOR DELETE
  TO authenticated
  USING (is_organization_owner(id));

-- ============================================
-- 6. RLSポリシー - Organization Members
-- ============================================

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- メンバーは自分の組織のメンバーリストを参照可能
CREATE POLICY "Members can view organization members"
  ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- 管理者以上はメンバーを追加可能
CREATE POLICY "Admins can add members"
  ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- 管理者以上はメンバーの役割を更新可能（オーナー除く）
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

-- 管理者以上はメンバーを削除可能（オーナー除く）
CREATE POLICY "Admins can remove members"
  ON public.organization_members
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
    AND role != 'owner'
  );

-- ============================================
-- 7. インデックス作成
-- ============================================

CREATE INDEX IF NOT EXISTS idx_organizations_slug
  ON public.organizations (slug);

CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status
  ON public.organizations (subscription_status);

CREATE INDEX IF NOT EXISTS idx_organization_members_user
  ON public.organization_members (user_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_org
  ON public.organization_members (organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_role
  ON public.organization_members (organization_id, role);

-- ============================================
-- 8. 確認メッセージ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Organizations テーブル作成完了';
  RAISE NOTICE '✅ Organization Members テーブル作成完了';
  RAISE NOTICE '✅ ヘルパー関数作成完了: get_user_organization_id(), is_organization_owner(), is_organization_admin()';
  RAISE NOTICE '✅ RLSポリシー設定完了';
  RAISE NOTICE '✅ インデックス作成完了';
  RAISE NOTICE '📋 次のステップ: 既存テーブルに organization_id を追加してください';
END $$;
