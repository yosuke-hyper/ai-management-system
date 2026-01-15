/*
  # エラーログテーブルのRLSポリシー修正

  ## 問題
  エラーログの挿入時にRLSポリシー違反が発生していました。
  認証済みユーザーがエラーログを作成できない状態でした。

  ## 修正内容
  1. 既存の制限的な挿入ポリシーを削除
  2. より柔軟な挿入ポリシーを作成
     - 認証済みユーザーは自分のエラーログを作成可能
     - organization_idがない場合でも作成可能（認証前のエラー）
     - システムエラーの記録も可能
*/

-- 既存の制限的なポリシーを削除
DROP POLICY IF EXISTS "Authenticated users can create error logs" ON error_logs;

-- 新しい柔軟なポリシーを作成
-- 認証済みユーザーは自分のエラーログを作成可能
CREATE POLICY "Users can create own error logs"
  ON error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- 自分のエラーログを作成可能
    auth.uid() = user_id OR
    -- user_idがnullの場合も許可（システムエラー等）
    user_id IS NULL
  );

-- 匿名ユーザー（anon）もエラーログを作成可能にする（ログイン前のエラー対応）
CREATE POLICY "Anonymous users can create error logs"
  ON error_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- サービスロール（service_role）は制限なし（バックグラウンドジョブ等で使用）
-- service_roleはRLSをバイパスするため、ポリシー不要
