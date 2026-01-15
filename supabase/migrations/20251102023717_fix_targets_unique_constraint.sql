/*
  # targetsテーブルのユニーク制約を修正

  1. 変更内容
    - 既存の`targets_store_id_period_key`制約を削除
    - `(store_id, period, organization_id)`の新しいユニーク制約を追加
  
  2. 理由
    - マルチテナント対応のため、organization_idを含める必要がある
    - 異なる組織が同じstore_id, periodの組み合わせを持つことができるようにする
*/

-- 既存のユニーク制約を削除
ALTER TABLE targets DROP CONSTRAINT IF EXISTS targets_store_id_period_key;

-- 新しいユニーク制約を追加（organization_idを含む）
ALTER TABLE targets ADD CONSTRAINT targets_store_id_period_organization_id_key 
  UNIQUE (store_id, period, organization_id);
