/*
  # オンボーディングシステムの作成

  1. 新規テーブル
    - `onboarding_progress` - ユーザーのオンボーディング進捗を追跡
      - `id` (uuid, primary key)
      - `user_id` (uuid, auth.users参照)
      - `organization_id` (uuid, organizations参照)
      - `step_store_created` (boolean) - 店舗作成完了
      - `step_first_report` (boolean) - 初回日報入力完了
      - `step_csv_imported` (boolean) - CSVインポート完了
      - `step_dashboard_viewed` (boolean) - ダッシュボード閲覧完了
      - `step_ai_chat_used` (boolean) - AIチャット利用完了
      - `sample_data_loaded` (boolean) - サンプルデータ読み込み済み
      - `onboarding_completed` (boolean) - オンボーディング完了
      - `onboarding_skipped` (boolean) - オンボーディングスキップ
      - `completed_at` (timestamptz) - 完了日時
      - `created_at` (timestamptz) - 作成日時
      - `updated_at` (timestamptz) - 更新日時

  2. セキュリティ
    - RLSを有効化
    - ユーザー自身のデータのみアクセス可能

  3. 自動作成トリガー
    - ユーザー登録時に自動でオンボーディングレコードを作成
*/

-- onboarding_progress テーブル作成
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  step_store_created boolean DEFAULT false,
  step_first_report boolean DEFAULT false,
  step_csv_imported boolean DEFAULT false,
  step_dashboard_viewed boolean DEFAULT false,
  step_ai_chat_used boolean DEFAULT false,
  sample_data_loaded boolean DEFAULT false,
  onboarding_completed boolean DEFAULT false,
  onboarding_skipped boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_org_id ON onboarding_progress(organization_id);

-- RLS有効化
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: ユーザーは自分のオンボーディング進捗のみ参照可能
CREATE POLICY "Users can view own onboarding progress"
  ON onboarding_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLSポリシー: ユーザーは自分のオンボーディング進捗を作成可能
CREATE POLICY "Users can insert own onboarding progress"
  ON onboarding_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLSポリシー: ユーザーは自分のオンボーディング進捗を更新可能
CREATE POLICY "Users can update own onboarding progress"
  ON onboarding_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_onboarding_progress_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_onboarding_progress_updated_at ON onboarding_progress;
CREATE TRIGGER trigger_update_onboarding_progress_updated_at
  BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_progress_updated_at();

-- オンボーディング完了時にcompleted_atを自動設定
CREATE OR REPLACE FUNCTION set_onboarding_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.onboarding_completed = true AND OLD.onboarding_completed = false THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_onboarding_completed_at ON onboarding_progress;
CREATE TRIGGER trigger_set_onboarding_completed_at
  BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION set_onboarding_completed_at();

-- 新規ユーザー登録時にオンボーディングレコードを自動作成する関数
CREATE OR REPLACE FUNCTION create_onboarding_progress_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id uuid;
BEGIN
  -- ユーザーの組織IDを取得
  SELECT organization_id INTO org_id
  FROM organization_members
  WHERE user_id = NEW.id
  LIMIT 1;

  -- オンボーディングレコードを作成
  INSERT INTO onboarding_progress (user_id, organization_id)
  VALUES (NEW.id, org_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- プロファイル作成時にオンボーディングレコードも作成
DROP TRIGGER IF EXISTS trigger_create_onboarding_on_profile ON profiles;
CREATE TRIGGER trigger_create_onboarding_on_profile
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_onboarding_progress_for_new_user();
