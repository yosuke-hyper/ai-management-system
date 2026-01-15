/*
  # 参考経費のINSERTポリシーを修正

  ## 変更内容
  - `expense_baselines`テーブルのINSERTポリシーを修正
  - admin権限だけでなく、全ての認証済みユーザーが自分の組織内で登録可能に変更
  
  ## 理由
  - 店長やスタッフも参考経費を登録できるようにするため
  - 組織IDのチェックは維持してセキュリティを確保
*/

DROP POLICY IF EXISTS "expense_baselines_insert" ON expense_baselines;

CREATE POLICY "expense_baselines_insert" ON expense_baselines
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = get_user_organization_id()
);