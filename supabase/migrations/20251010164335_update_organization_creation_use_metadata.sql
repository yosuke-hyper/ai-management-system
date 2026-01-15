/*
  # 組織作成時にメタデータから組織名を取得

  ## 概要
  プロファイル作成時に、ユーザーのメタデータから organizationName を取得して
  組織名に使用するように関数を更新します。

  ## 変更内容
  - create_organization_for_new_profile() 関数を更新
  - auth.users の raw_user_meta_data から organizationName を取得
  - 組織名の生成ロジックを改善
*/

-- ============================================
-- プロファイル作成時の組織自動作成関数（更新版）
-- ============================================

CREATE OR REPLACE FUNCTION public.create_organization_for_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  org_name text;
  org_slug text;
  existing_org_id uuid;
  user_metadata jsonb;
BEGIN
  -- 既に organization_id が設定されている場合はスキップ
  IF NEW.organization_id IS NOT NULL THEN
    RAISE NOTICE 'Profile already has organization_id, skipping auto-creation';
    RETURN NEW;
  END IF;

  -- 既に organization_members に登録されているかチェック
  SELECT organization_id INTO existing_org_id
  FROM public.organization_members
  WHERE user_id = NEW.id
  LIMIT 1;

  IF existing_org_id IS NOT NULL THEN
    -- 既存の組織があればそれを使用
    NEW.organization_id := existing_org_id;
    RAISE NOTICE '✅ Using existing organization: %', existing_org_id;
    RETURN NEW;
  END IF;

  -- auth.users からユーザーのメタデータを取得
  SELECT raw_user_meta_data INTO user_metadata
  FROM auth.users
  WHERE id = NEW.id;

  -- 組織名を決定（優先順位: メタデータの organizationName > プロファイル名 + "の組織" > メールアドレス + "の組織"）
  org_name := COALESCE(
    user_metadata->>'organizationName',
    COALESCE(NEW.name, NEW.email, 'ユーザー') || 'の組織'
  );

  -- スラッグを生成
  org_slug := 'org-' || substring(NEW.id::text from 1 for 8);

  -- スラッグの重複を避けるため、既存チェック
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = org_slug) LOOP
    org_slug := 'org-' || substring(NEW.id::text from 1 for 8) || '-' || floor(random() * 1000)::text;
  END LOOP;

  -- 新しい組織を作成
  INSERT INTO public.organizations (
    name,
    slug,
    email,
    subscription_status,
    subscription_plan,
    trial_ends_at,
    max_stores,
    max_users,
    max_ai_requests_per_month
  ) VALUES (
    org_name,
    org_slug,
    COALESCE(NEW.email, 'noreply@example.com'),
    'trial',
    'starter',
    now() + interval '14 days',
    3,
    5,
    100
  )
  RETURNING id INTO new_org_id;

  RAISE NOTICE '✅ Created organization: % (ID: %) for user: %', org_name, new_org_id, NEW.id;

  -- organization_members にオーナーとして登録
  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    joined_at
  ) VALUES (
    new_org_id,
    NEW.id,
    'owner',
    now()
  )
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RAISE NOTICE '✅ Added user as organization owner';

  -- プロファイルに organization_id を設定
  NEW.organization_id := new_org_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create organization for profile %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_organization_for_new_profile() IS 'プロファイル作成時に組織を自動作成（メタデータから組織名を取得）';

-- ============================================
-- 確認メッセージ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 組織自動作成関数を更新しました';
  RAISE NOTICE '📋 ユーザーのメタデータから organizationName を取得します';
  RAISE NOTICE '========================================';
END $$;
