/*
  # ゲーミフィケーションとAIパートナー機能の追加

  1. 新規カラム
    - `points` (integer): 現在の保有ポイント。デフォルトは 0。
    - `total_points` (integer): 累計獲得ポイント（ランク判定用）。デフォルトは 0。
    - `ai_name` (text): ユーザーがつけたAIの名前。デフォルトは 'AIパートナー'。
    - `ai_personality` (text): AIの性格タイプ。デフォルトは 'cheerful'。
    - `unlocked_items` (jsonb): 獲得したアバターアイテムのIDリスト。デフォルトは []。

  2. 新規関数
    - `increment_points(user_id, amount)`: ポイントを安全に加算する関数
    - `spend_points(user_id, amount)`: ポイントを消費する関数
    - `unlock_item(user_id, item_id)`: アイテムを解除する関数

  3. セキュリティ
    - 既存のRLSポリシーが自動的に適用されます
*/

-- ============================================
-- 1. profilesテーブルにカラムを追加
-- ============================================

-- ポイント関連
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'points'
  ) THEN
    ALTER TABLE profiles ADD COLUMN points integer DEFAULT 0 NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'total_points'
  ) THEN
    ALTER TABLE profiles ADD COLUMN total_points integer DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- AIパートナー関連
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ai_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ai_name text DEFAULT 'AIパートナー' NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ai_personality'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ai_personality text DEFAULT 'cheerful' NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'unlocked_items'
  ) THEN
    ALTER TABLE profiles ADD COLUMN unlocked_items jsonb DEFAULT '[]'::jsonb NOT NULL;
  END IF;
END $$;

-- カラムにコメントを追加
COMMENT ON COLUMN profiles.points IS '現在の保有ポイント';
COMMENT ON COLUMN profiles.total_points IS '累計獲得ポイント（ランク判定用）';
COMMENT ON COLUMN profiles.ai_name IS 'ユーザーがつけたAIの名前';
COMMENT ON COLUMN profiles.ai_personality IS 'AIの性格タイプ（cheerful, serious, friendly等）';
COMMENT ON COLUMN profiles.unlocked_items IS '獲得したアバターアイテムのIDリスト';

-- ============================================
-- 2. ポイント加算用の関数を作成
-- ============================================

CREATE OR REPLACE FUNCTION increment_points(
  user_id uuid,
  amount integer
)
RETURNS TABLE (
  new_points integer,
  new_total_points integer,
  success boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_points integer;
  current_total_points integer;
BEGIN
  -- ポイント数が正の値かチェック
  IF amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- ユーザーが存在するかチェック
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- ポイントを加算（アトミックな操作）
  UPDATE profiles
  SET
    points = points + amount,
    total_points = total_points + amount,
    updated_at = now()
  WHERE id = user_id
  RETURNING profiles.points, profiles.total_points
  INTO current_points, current_total_points;

  -- 結果を返す
  RETURN QUERY SELECT current_points, current_total_points, true;
END;
$$;

COMMENT ON FUNCTION increment_points(uuid, integer) IS 'ユーザーのポイントを安全に加算する関数';

-- ============================================
-- 3. ポイント消費用の関数を作成
-- ============================================

CREATE OR REPLACE FUNCTION spend_points(
  user_id uuid,
  amount integer
)
RETURNS TABLE (
  new_points integer,
  success boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_points integer;
BEGIN
  -- ポイント数が正の値かチェック
  IF amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- 現在のポイント数を取得
  SELECT points INTO current_points
  FROM profiles
  WHERE id = user_id;

  -- ユーザーが存在するかチェック
  IF current_points IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- 十分なポイントがあるかチェック
  IF current_points < amount THEN
    RAISE EXCEPTION 'Insufficient points. Current: %, Required: %', current_points, amount;
  END IF;

  -- ポイントを消費
  UPDATE profiles
  SET
    points = points - amount,
    updated_at = now()
  WHERE id = user_id
  RETURNING profiles.points
  INTO current_points;

  -- 結果を返す
  RETURN QUERY SELECT current_points, true;
END;
$$;

COMMENT ON FUNCTION spend_points(uuid, integer) IS 'ユーザーのポイントを消費する関数';

-- ============================================
-- 4. アイテム解除用の関数を作成
-- ============================================

CREATE OR REPLACE FUNCTION unlock_item(
  user_id uuid,
  item_id text
)
RETURNS TABLE (
  unlocked_items jsonb,
  success boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_items jsonb;
BEGIN
  -- ユーザーが存在するかチェック
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- 現在の解除済みアイテムを取得
  SELECT profiles.unlocked_items INTO current_items
  FROM profiles
  WHERE id = user_id;

  -- すでに解除済みかチェック
  IF current_items @> to_jsonb(ARRAY[item_id]) THEN
    RAISE EXCEPTION 'Item already unlocked';
  END IF;

  -- アイテムを追加
  UPDATE profiles
  SET
    unlocked_items = unlocked_items || to_jsonb(ARRAY[item_id]),
    updated_at = now()
  WHERE id = user_id
  RETURNING profiles.unlocked_items
  INTO current_items;

  -- 結果を返す
  RETURN QUERY SELECT current_items, true;
END;
$$;

COMMENT ON FUNCTION unlock_item(uuid, text) IS 'ユーザーの解除済みアイテムリストにアイテムを追加する関数';

-- ============================================
-- 5. ユーザーランク取得用のビューを作成
-- ============================================

CREATE OR REPLACE VIEW user_ranks AS
SELECT
  id,
  name,
  email,
  points,
  total_points,
  ai_name,
  ai_personality,
  unlocked_items,
  CASE
    WHEN total_points >= 10000 THEN 'master'
    WHEN total_points >= 5000 THEN 'expert'
    WHEN total_points >= 2000 THEN 'advanced'
    WHEN total_points >= 500 THEN 'intermediate'
    ELSE 'beginner'
  END as rank,
  CASE
    WHEN total_points >= 10000 THEN 5
    WHEN total_points >= 5000 THEN 4
    WHEN total_points >= 2000 THEN 3
    WHEN total_points >= 500 THEN 2
    ELSE 1
  END as rank_level
FROM profiles;

COMMENT ON VIEW user_ranks IS 'ユーザーのポイントとランクを表示するビュー';

-- ============================================
-- 6. インデックスの作成
-- ============================================

-- ポイントでのソート用インデックス
CREATE INDEX IF NOT EXISTS idx_profiles_points ON profiles(points DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_total_points ON profiles(total_points DESC);

-- ============================================
-- 7. 既存ユーザーのデータを初期化
-- ============================================

-- 既存のユーザーのポイントとAI設定を初期化（NULLの場合のみ）
UPDATE profiles
SET
  points = COALESCE(points, 0),
  total_points = COALESCE(total_points, 0),
  ai_name = COALESCE(ai_name, 'AIパートナー'),
  ai_personality = COALESCE(ai_personality, 'cheerful'),
  unlocked_items = COALESCE(unlocked_items, '[]'::jsonb)
WHERE
  points IS NULL
  OR total_points IS NULL
  OR ai_name IS NULL
  OR ai_personality IS NULL
  OR unlocked_items IS NULL;