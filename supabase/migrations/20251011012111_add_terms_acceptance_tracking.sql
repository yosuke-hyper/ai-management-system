/*
  # 利用規約・プライバシーポリシーの同意追跡

  ## 概要
  ユーザーの利用規約とプライバシーポリシーの同意状況を追跡する機能を追加します。

  ## 変更内容
  - profilesテーブルに同意関連のカラムを追加

  ## 新規カラム
  - terms_accepted (boolean) - 利用規約への同意
  - terms_accepted_at (timestamptz) - 同意日時
  - privacy_accepted (boolean) - プライバシーポリシーへの同意
  - privacy_accepted_at (timestamptz) - 同意日時
  - terms_version (text) - 同意した利用規約のバージョン
  - privacy_version (text) - 同意したプライバシーポリシーのバージョン
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'terms_accepted'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN terms_accepted boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'terms_accepted_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN terms_accepted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'privacy_accepted'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN privacy_accepted boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'privacy_accepted_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN privacy_accepted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'terms_version'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN terms_version text DEFAULT '1.0';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'privacy_version'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN privacy_version text DEFAULT '1.0';
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.terms_accepted IS '利用規約への同意状況';
COMMENT ON COLUMN public.profiles.terms_accepted_at IS '利用規約同意日時';
COMMENT ON COLUMN public.profiles.privacy_accepted IS 'プライバシーポリシーへの同意状況';
COMMENT ON COLUMN public.profiles.privacy_accepted_at IS 'プライバシーポリシー同意日時';
COMMENT ON COLUMN public.profiles.terms_version IS '同意した利用規約のバージョン';
COMMENT ON COLUMN public.profiles.privacy_version IS '同意したプライバシーポリシーのバージョン';

CREATE OR REPLACE FUNCTION public.accept_terms_and_privacy(
  p_user_id uuid,
  p_terms_version text DEFAULT '1.0',
  p_privacy_version text DEFAULT '1.0'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET
    terms_accepted = true,
    terms_accepted_at = now(),
    privacy_accepted = true,
    privacy_accepted_at = now(),
    terms_version = p_terms_version,
    privacy_version = p_privacy_version,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.accept_terms_and_privacy IS 'ユーザーの利用規約・プライバシーポリシー同意を記録';
