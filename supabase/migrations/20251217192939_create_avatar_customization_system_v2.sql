/*
  # アバター着せ替えシステム

  1. 新しいテーブル
    - `avatar_items` テーブル（アイテムマスタ）
      - `id` (text, PK): アイテムID（例: 'head_chef_hat'）
      - `category` (text): カテゴリ（'head', 'outfit', 'hand'）
      - `name` (text): アイテムの表示名
      - `price` (integer): 購入に必要なポイント
      - `image_path` (text): 画像ファイル名
      - `is_default` (boolean): 初期装備かどうか
      - `description` (text): アイテムの説明
      - `rarity` (text): レアリティ（'common', 'rare', 'epic', 'legendary'）
      - `created_at` (timestamptz): 作成日時

  2. profiles テーブルの拡張
    - `equipped_items` (jsonb): 現在装備中のアイテム（新規追加）
    - `unlocked_items` (jsonb): 解除済みのアイテムID配列（既存）

  3. 機能
    - アイテム購入用のRPC関数 `purchase_avatar_item`
    - 装備変更用のRPC関数 `equip_avatar_item`
    - 装備解除用のRPC関数 `unequip_avatar_item`

  4. セキュリティ
    - `avatar_items` テーブルは全ユーザーが読み取り可能
    - プロフィール情報は本人のみ更新可能

  5. 初期データ
    - 頭部: コック帽（200pt）、赤い帽子（150pt）
    - 服装: 赤エプロン（0pt・デフォルト）、スーツ（300pt）
    - 手持ち: レードル（100pt）、金のフライパン（500pt）
*/

-- 1. avatar_items テーブルを作成
CREATE TABLE IF NOT EXISTS avatar_items (
  id text PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('head', 'outfit', 'hand')),
  name text NOT NULL,
  price integer NOT NULL DEFAULT 0 CHECK (price >= 0),
  image_path text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  description text,
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at timestamptz DEFAULT now()
);

-- 2. profiles テーブルに equipped_items カラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'equipped_items'
  ) THEN
    ALTER TABLE profiles ADD COLUMN equipped_items jsonb DEFAULT '{"head": null, "outfit": "outfit_apron_red", "hand": null}'::jsonb;
  END IF;
END $$;

-- 3. RLS ポリシーの設定（avatar_items）
ALTER TABLE avatar_items ENABLE ROW LEVEL SECURITY;

-- すべての認証済みユーザーがアイテム一覧を読み取り可能
DROP POLICY IF EXISTS "Anyone can view avatar items" ON avatar_items;
CREATE POLICY "Anyone can view avatar items"
  ON avatar_items FOR SELECT
  TO authenticated
  USING (true);

-- 管理者のみがアイテムを追加・更新可能
DROP POLICY IF EXISTS "Admins can manage avatar items" ON avatar_items;
CREATE POLICY "Admins can manage avatar items"
  ON avatar_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- 4. アイテム購入用のRPC関数
CREATE OR REPLACE FUNCTION purchase_avatar_item(
  p_item_id text,
  p_cost integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_points integer;
  v_unlocked_items jsonb;
  v_result jsonb;
BEGIN
  -- ユーザーが認証されているか確認
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '認証が必要です'
    );
  END IF;

  -- アイテムが存在するか確認
  IF NOT EXISTS (SELECT 1 FROM avatar_items WHERE id = p_item_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'アイテムが存在しません'
    );
  END IF;

  -- 現在のポイントと解除済みアイテムを取得
  SELECT points, COALESCE(unlocked_items, '[]'::jsonb)
  INTO v_current_points, v_unlocked_items
  FROM profiles
  WHERE id = auth.uid()
  FOR UPDATE;

  -- すでに解除済みか確認（jsonb配列に含まれているか）
  IF v_unlocked_items @> to_jsonb(p_item_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'すでに購入済みのアイテムです'
    );
  END IF;

  -- ポイントが足りるか確認
  IF v_current_points < p_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ポイントが不足しています',
      'current_points', v_current_points,
      'required_points', p_cost
    );
  END IF;

  -- ポイントを消費し、アイテムを解除
  UPDATE profiles
  SET
    points = points - p_cost,
    unlocked_items = unlocked_items || to_jsonb(p_item_id)
  WHERE id = auth.uid();

  -- 更新後のポイントを取得
  SELECT points INTO v_current_points
  FROM profiles
  WHERE id = auth.uid();

  RETURN jsonb_build_object(
    'success', true,
    'remaining_points', v_current_points,
    'unlocked_item', p_item_id
  );
END;
$$;

-- 5. 装備変更用のRPC関数
CREATE OR REPLACE FUNCTION equip_avatar_item(
  p_item_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unlocked_items jsonb;
  v_item_category text;
  v_equipped_items jsonb;
BEGIN
  -- ユーザーが認証されているか確認
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '認証が必要です'
    );
  END IF;

  -- アイテムのカテゴリを取得
  SELECT category INTO v_item_category
  FROM avatar_items
  WHERE id = p_item_id;

  IF v_item_category IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'アイテムが存在しません'
    );
  END IF;

  -- 解除済みアイテムを取得
  SELECT COALESCE(unlocked_items, '[]'::jsonb)
  INTO v_unlocked_items
  FROM profiles
  WHERE id = auth.uid();

  -- アイテムが解除されているか確認
  IF NOT (v_unlocked_items @> to_jsonb(p_item_id)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'このアイテムはまだ購入されていません'
    );
  END IF;

  -- 装備を更新
  UPDATE profiles
  SET equipped_items = jsonb_set(
    COALESCE(equipped_items, '{}'::jsonb),
    ARRAY[v_item_category],
    to_jsonb(p_item_id)
  )
  WHERE id = auth.uid()
  RETURNING equipped_items INTO v_equipped_items;

  RETURN jsonb_build_object(
    'success', true,
    'equipped_items', v_equipped_items
  );
END;
$$;

-- 6. 装備を外す（null にする）RPC関数
CREATE OR REPLACE FUNCTION unequip_avatar_item(
  p_category text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_equipped_items jsonb;
BEGIN
  -- ユーザーが認証されているか確認
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '認証が必要です'
    );
  END IF;

  -- カテゴリの検証
  IF p_category NOT IN ('head', 'outfit', 'hand') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '無効なカテゴリです'
    );
  END IF;

  -- 装備を外す
  UPDATE profiles
  SET equipped_items = jsonb_set(
    COALESCE(equipped_items, '{}'::jsonb),
    ARRAY[p_category],
    'null'::jsonb
  )
  WHERE id = auth.uid()
  RETURNING equipped_items INTO v_equipped_items;

  RETURN jsonb_build_object(
    'success', true,
    'equipped_items', v_equipped_items
  );
END;
$$;

-- 7. 初期アイテムデータを投入
INSERT INTO avatar_items (id, category, name, price, image_path, is_default, description, rarity) VALUES
  -- 頭部アイテム
  ('head_chef_hat', 'head', 'コック帽', 200, 'head_chef_hat.png', false, 'プロの料理人の証', 'rare'),
  ('head_redcap', 'head', '赤い帽子', 150, 'head_redcap.png', false, 'カジュアルでおしゃれな帽子', 'common'),
  
  -- 服装アイテム
  ('outfit_apron_red', 'outfit', '赤いエプロン', 0, 'outfit_apron_red.png', true, '基本の赤いエプロン', 'common'),
  ('outfit_suit', 'outfit', 'ビジネススーツ', 300, 'outfit_suit.png', false, 'エレガントなスーツスタイル', 'epic'),
  
  -- 手持ちアイテム
  ('hand_ladle', 'hand', 'レードル', 100, 'hand_ladle.png', false, '便利なお玉', 'common'),
  ('hand_pan', 'hand', '金のフライパン', 500, 'hand_pan.png', false, '伝説の黄金フライパン', 'legendary')
ON CONFLICT (id) DO NOTHING;

-- 8. 既存ユーザーにデフォルト値を設定
-- unlocked_items が空の場合は outfit_apron_red を追加
UPDATE profiles
SET unlocked_items = '["outfit_apron_red"]'::jsonb
WHERE unlocked_items = '[]'::jsonb OR unlocked_items IS NULL;

-- equipped_items を設定
UPDATE profiles
SET equipped_items = '{"head": null, "outfit": "outfit_apron_red", "hand": null}'::jsonb
WHERE equipped_items IS NULL;

-- 9. インデックスを作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_avatar_items_category ON avatar_items(category);
CREATE INDEX IF NOT EXISTS idx_avatar_items_price ON avatar_items(price);
CREATE INDEX IF NOT EXISTS idx_profiles_unlocked_items ON profiles USING GIN(unlocked_items);
CREATE INDEX IF NOT EXISTS idx_profiles_equipped_items ON profiles USING GIN(equipped_items);
