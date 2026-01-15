/*
  # デモ店舗のINSERTポリシー修正

  1. 変更内容
    - demo_stores: 初期セットアップ時に誰でもINSERT可能に変更
    - セッション作成直後に店舗を作成できるようにする

  2. セキュリティ
    - 作成後はセッショントークンで保護されたSELECT/UPDATE/DELETEが適用
*/

-- demo_stores のINSERTポリシーを削除して再作成
DROP POLICY IF EXISTS "Demo stores insertable by demo session" ON demo_stores;

-- 誰でもデモ店舗を作成可能（セッション作成時に必要）
CREATE POLICY "Anyone can create demo stores"
  ON demo_stores
  FOR INSERT
  WITH CHECK (true);
