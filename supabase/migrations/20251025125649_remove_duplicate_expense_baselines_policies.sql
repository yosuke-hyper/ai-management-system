/*
  # 重複したexpense_baselinesポリシーを削除

  ## 変更内容
  - 古い`expense_baselines_ins`、`expense_baselines_upd`、`expense_baselines_del`ポリシーを削除
  - 新しいポリシー（`expense_baselines_insert`等）のみを残す
  
  ## 理由
  - 古いポリシーが`is_admin()`を要求していたため、店長やスタッフが登録できなかった
  - 重複ポリシーを削除してシンプルな権限管理に統一
*/

-- 古いポリシーを削除
DROP POLICY IF EXISTS "expense_baselines_ins" ON expense_baselines;
DROP POLICY IF EXISTS "expense_baselines_upd" ON expense_baselines;
DROP POLICY IF EXISTS "expense_baselines_del" ON expense_baselines;