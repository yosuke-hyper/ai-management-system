/*
  # admin_override_logs の外部キーを profiles に変更

  ## 問題
  - `admin_override_logs.admin_user_id` が `auth.users` を参照している
  - PostgREST は `auth.users` への埋め込みクエリをサポートしていない
  - フロントエンドで `profiles:admin_user_id(full_name)` が動作しない

  ## 変更内容
  1. 既存の外部キー制約を削除（auth.users 参照）
  2. 新しい外部キー制約を追加（profiles 参照）
  3. パフォーマンス向上のためのインデックスを追加

  ## セキュリティ
  - `profiles` テーブルへの参照により、PostgREST の埋め込みクエリが可能に
  - `ON DELETE SET NULL` により、ユーザー削除時もログは保持
*/

-- 既存の auth.users への外部キーを削除
ALTER TABLE public.admin_override_logs
DROP CONSTRAINT IF EXISTS admin_override_logs_admin_user_id_fkey;

-- profiles への外部キーを追加
ALTER TABLE public.admin_override_logs
ADD CONSTRAINT admin_override_logs_admin_user_id_fkey
FOREIGN KEY (admin_user_id) 
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- パフォーマンス向上のためのインデックスを追加
CREATE INDEX IF NOT EXISTS idx_admin_override_logs_admin_user_id 
ON public.admin_override_logs(admin_user_id);
