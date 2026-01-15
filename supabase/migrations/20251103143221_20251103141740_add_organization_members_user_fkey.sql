/*
  # organization_membersに外部キー制約を追加

  ## 変更内容
  1. organization_members.user_id に profiles テーブルへの外部キー制約を追加
     - これにより Supabase の自動 JOIN 機能が使用可能になります
     - データ整合性が保証されます
  
  ## 理由
  - Supabase PostgREST は外部キー制約を利用して自動的にリレーションシップを検出します
  - 外部キー制約がないと、明示的な外部キー名を指定しても機能しません
*/

-- 既存の制約を確認して存在しない場合のみ追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'organization_members_user_id_fkey'
    AND table_name = 'organization_members'
  ) THEN
    -- organization_members.user_id に外部キー制約を追加
    ALTER TABLE public.organization_members
      ADD CONSTRAINT organization_members_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Added foreign key constraint organization_members_user_id_fkey';
  ELSE
    RAISE NOTICE 'ℹ️  Foreign key constraint already exists';
  END IF;
END $$;

-- インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id
  ON public.organization_members(user_id);

-- コメントを追加
DO $$
BEGIN
  EXECUTE format(
    'COMMENT ON CONSTRAINT organization_members_user_id_fkey ON %I.%I IS %L',
    'public',
    'organization_members',
    'profilesテーブルへの外部キー。ユーザー削除時にメンバーシップも削除されます。'
  );
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'Could not add comment - constraint may not exist yet';
END $$;
