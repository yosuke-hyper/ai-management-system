/*
  # 開発環境用：利用規約の自動承認設定

  ## 概要
  開発環境でスムーズに動作するように、新規ユーザーの利用規約を自動承認します。

  ## 変更内容
  1. accept_terms_and_privacy関数の修正（user_id → id）
  2. 既存ユーザーの利用規約を自動承認（開発環境用）
  3. 新規ユーザー作成時に利用規約を自動承認するトリガー追加
*/

-- ============================================
-- 1. accept_terms_and_privacy関数の修正
-- ============================================

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
  WHERE id = p_user_id;  -- user_id から id に修正
END;
$$;

COMMENT ON FUNCTION public.accept_terms_and_privacy IS 'ユーザーの利用規約・プライバシーポリシー同意を記録（修正版）';

-- ============================================
-- 2. 既存ユーザーの利用規約を自動承認（開発環境用）
-- ============================================

UPDATE public.profiles
SET
  terms_accepted = true,
  terms_accepted_at = COALESCE(terms_accepted_at, now()),
  privacy_accepted = true,
  privacy_accepted_at = COALESCE(privacy_accepted_at, now()),
  terms_version = COALESCE(terms_version, '1.0'),
  privacy_version = COALESCE(privacy_version, '1.0'),
  updated_at = now()
WHERE terms_accepted = false OR privacy_accepted = false OR terms_accepted IS NULL OR privacy_accepted IS NULL;

-- ============================================
-- 3. 新規ユーザー作成時に利用規約を自動承認するトリガー
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_accept_terms_on_profile_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 新規作成時のみ、利用規約を自動承認（開発環境用）
  IF NEW.terms_accepted IS NULL OR NEW.terms_accepted = false THEN
    NEW.terms_accepted := true;
    NEW.terms_accepted_at := now();
  END IF;

  IF NEW.privacy_accepted IS NULL OR NEW.privacy_accepted = false THEN
    NEW.privacy_accepted := true;
    NEW.privacy_accepted_at := now();
  END IF;

  IF NEW.terms_version IS NULL THEN
    NEW.terms_version := '1.0';
  END IF;

  IF NEW.privacy_version IS NULL THEN
    NEW.privacy_version := '1.0';
  END IF;

  RETURN NEW;
END;
$$;

-- 既存のトリガーを削除してから再作成
DROP TRIGGER IF EXISTS auto_accept_terms_trigger ON public.profiles;

CREATE TRIGGER auto_accept_terms_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_accept_terms_on_profile_creation();

COMMENT ON FUNCTION public.auto_accept_terms_on_profile_creation IS '開発環境用：プロフィール作成時に利用規約を自動承認';

-- ============================================
-- 確認メッセージ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 利用規約の自動承認設定を完了しました';
  RAISE NOTICE '📋 既存ユーザーの利用規約を承認済みに更新';
  RAISE NOTICE '📋 新規ユーザーは自動的に利用規約が承認されます';
  RAISE NOTICE '========================================';
END $$;
