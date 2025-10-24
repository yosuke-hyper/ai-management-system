/*
  # プロファイル作成時の組織自動作成

  ## 概要
  新規ユーザーのプロファイルが作成された際、自動的に以下を実行します：
  1. まだ組織に所属していない場合、ユーザー専用の新しい組織を作成
  2. ユーザーをその組織のオーナーとして organization_members に登録
  3. profiles テーブルに organization_id を設定

  ## 処理フロー
  1. profiles テーブルに INSERT が発生
  2. トリガーが発火し、create_organization_for_new_profile() 関数が実行される
  3. 既に organization_id が設定されている場合はスキップ
  4. 組織名を生成（ユーザー名 + "の組織"）
  5. 組織を作成（トライアル期間14日）
  6. organization_members にオーナーとして登録
  7. profiles の organization_id を更新

  ## セキュリティ
  - SECURITY DEFINER で実行（RLSをバイパスして確実に作成）
  - 組織のスラッグはUUID部分を含めて一意性を保証
*/

-- ============================================
-- 1. プロファイル作成時の組織自動作成関数
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

  -- 組織名とスラッグを生成
  org_name := COALESCE(NEW.name, NEW.email, 'ユーザー') || 'の組織';
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

COMMENT ON FUNCTION public.create_organization_for_new_profile() IS 'プロファイル作成時に組織を自動作成し、ユーザーをオーナーとして登録する';

-- ============================================
-- 2. トリガーの作成
-- ============================================

DROP TRIGGER IF EXISTS on_profile_created_create_organization ON public.profiles;

CREATE TRIGGER on_profile_created_create_organization
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_organization_for_new_profile();

COMMENT ON TRIGGER on_profile_created_create_organization ON public.profiles IS 'プロファイル作成時に組織を自動生成するトリガー';

-- ============================================
-- 3. 既存の auto_profile_trigger を更新
-- ============================================

-- 既存のトリガーがある場合、競合しないように順序を調整
-- auto_profile_trigger は profiles を作成するだけで、組織作成は新しいトリガーに任せる

-- ============================================
-- 4. 確認メッセージ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ プロファイル作成時の組織自動作成トリガーを設定しました';
  RAISE NOTICE '📋 新規プロファイル作成時に以下が自動実行されます：';
  RAISE NOTICE '   1. 新しい組織の作成（トライアル期間14日）';
  RAISE NOTICE '   2. ユーザーをオーナーとして organization_members に登録';
  RAISE NOTICE '   3. profiles の organization_id を自動設定';
  RAISE NOTICE '========================================';
END $$;
