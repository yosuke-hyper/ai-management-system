/*
  # organization_subscriptions の INSERT ポリシーを修正

  ## 問題
  - プラン変更時に "new row violates row-level security policy" エラーが発生
  - WITH CHECK 句が INSERT 時に正しく動作していない
  - organization_subscriptions.organization_id が新規レコードなので、
    WITH CHECK でチェックする際に自己参照になってしまう

  ## 解決策
  - WITH CHECK 句では、挿入しようとしている organization_id に対して
    ユーザーが owner であるかをチェックする
  - INSERT 対象のレコードではなく、organization_members テーブルで
    権限をチェックする

  ## 変更内容
  - "Organization owners can manage subscription" ポリシーの WITH CHECK を修正
*/

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Organization owners can manage subscription" ON organization_subscriptions;

-- 新しいポリシーを作成（INSERT 対応版）
CREATE POLICY "Organization owners can manage subscription"
  ON organization_subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_subscriptions.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
    )
  )
  WITH CHECK (
    -- INSERT 時は、新規レコードの organization_id に対して
    -- ユーザーが owner であることを確認
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_subscriptions.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
    )
  );

-- 確認メッセージ
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ organization_subscriptions の RLS ポリシーを修正しました';
  RAISE NOTICE '📋 owner ロールのユーザーが INSERT/UPDATE/DELETE できます';
  RAISE NOTICE '========================================';
END $$;
