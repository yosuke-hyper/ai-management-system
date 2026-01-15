/*
  # プロフィールRLSポリシーの修正

  ## 問題
  現在のprofiles SELECTポリシーは自分のプロフィールのみ閲覧可能で、
  組織のメンバー一覧取得時に他のメンバーのプロフィールが見えない。

  ## 変更内容
  1. 既存の制限的なSELECTポリシーを削除
  2. 新しいポリシーを追加：
     - 自分のプロフィール
     - 同じ組織のメンバーのプロフィール

  ## セキュリティ
  - 組織が異なる場合はプロフィールは見えない
  - 組織内のメンバー情報のみ閲覧可能
*/

-- 既存の制限的なSELECTポリシーを削除
DROP POLICY IF EXISTS "profiles_select" ON profiles;

-- 新しいSELECTポリシーを作成
-- 1. 自分のプロフィール
-- 2. 同じ組織のメンバーのプロフィール
CREATE POLICY "Users can view profiles in their organization"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- 自分のプロフィール
    id = auth.uid()
    OR
    -- 同じ組織のメンバーのプロフィール
    EXISTS (
      SELECT 1 
      FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
        AND om2.user_id = profiles.id
    )
  );
