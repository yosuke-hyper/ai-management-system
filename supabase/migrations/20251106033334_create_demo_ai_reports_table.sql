/*
  # デモAIレポートテーブル作成

  1. 目的
    - デモセッション中に生成されたAIレポートを保存
    - 同じデモセッションで再度アクセスした時に閲覧可能にする
    - デモセッション終了後も一定期間保持（管理用）

  2. 新規テーブル
    - `demo_ai_reports` - デモ用AIレポート保存テーブル

  3. カラム
    - id: UUID主キー
    - demo_session_id: デモセッションID（fixed-demo-sessionまたは個別セッション）
    - store_id: 対象店舗ID（fixed_demo_storesまたはdemo_stores）
    - report_type: レポートタイプ（weekly/monthly）
    - period_start: 期間開始日
    - period_end: 期間終了日
    - title: レポートタイトル
    - summary: 要約
    - analysis_content: 分析内容（JSON）
    - key_insights: 主要インサイト（配列）
    - recommendations: 推奨事項（配列）
    - metrics: メトリクス（JSON）
    - generated_by: 生成者（通常は'demo-user'）
    - generated_at: 生成日時
    - created_at: 作成日時

  4. セキュリティ
    - RLS有効化
    - 全員が読み取り可能（デモレポートは公開）
    - 書き込みはシステムのみ（Edge Function経由）

  5. インデックス
    - demo_session_id（高速検索用）
    - generated_at（日付順ソート用）
*/

-- デモAIレポートテーブル作成
CREATE TABLE IF NOT EXISTS demo_ai_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_session_id text NOT NULL,
  store_id text,
  report_type text NOT NULL CHECK (report_type IN ('weekly', 'monthly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  analysis_content jsonb DEFAULT '{}'::jsonb,
  key_insights text[] DEFAULT ARRAY[]::text[],
  recommendations text[] DEFAULT ARRAY[]::text[],
  metrics jsonb DEFAULT '{}'::jsonb,
  generated_by text DEFAULT 'demo-user',
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- RLS有効化
ALTER TABLE demo_ai_reports ENABLE ROW LEVEL SECURITY;

-- 全員が読み取り可能（デモレポートは公開）
CREATE POLICY "Anyone can view demo AI reports"
  ON demo_ai_reports
  FOR SELECT
  USING (true);

-- システムのみが書き込み可能（Edge Function経由）
-- サービスロールキーを使用するため、通常ユーザーは書き込み不可
CREATE POLICY "Service role can insert demo AI reports"
  ON demo_ai_reports
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role' OR auth.jwt() IS NULL);

CREATE POLICY "Service role can update demo AI reports"
  ON demo_ai_reports
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role' OR auth.jwt() IS NULL);

CREATE POLICY "Service role can delete demo AI reports"
  ON demo_ai_reports
  FOR DELETE
  USING (auth.jwt()->>'role' = 'service_role' OR auth.jwt() IS NULL);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_demo_ai_reports_session 
  ON demo_ai_reports(demo_session_id);

CREATE INDEX IF NOT EXISTS idx_demo_ai_reports_generated_at 
  ON demo_ai_reports(generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_demo_ai_reports_store 
  ON demo_ai_reports(store_id);

-- コメント追加
COMMENT ON TABLE demo_ai_reports IS 'デモセッション用のAI生成レポートを保存';
COMMENT ON COLUMN demo_ai_reports.demo_session_id IS 'デモセッションID（固定デモまたは個別セッション）';
COMMENT ON COLUMN demo_ai_reports.store_id IS '対象店舗ID（fixed_demo_storesまたはdemo_stores参照）';
