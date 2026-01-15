/*
  # AI Automated Report Generation System

  ## Overview
  This migration creates the infrastructure for AI-powered automated weekly and monthly report generation.
  The system will automatically analyze business data and generate comprehensive reports with insights.

  ## New Tables
  
  ### 1. `ai_generated_reports`
  Stores AI-generated analysis reports
  - `id` (uuid, primary key) - Unique report identifier
  - `store_id` (uuid, nullable) - Store ID if report is store-specific, null for all-store reports
  - `report_type` (text) - Type: 'weekly' or 'monthly'
  - `period_start` (date) - Start date of reporting period
  - `period_end` (date) - End date of reporting period
  - `title` (text) - Report title
  - `summary` (text) - Executive summary section
  - `analysis_content` (jsonb) - Detailed analysis sections in structured format
  - `key_insights` (text[]) - Array of key insights/findings
  - `recommendations` (text[]) - Array of actionable recommendations
  - `metrics` (jsonb) - Calculated metrics (sales, profit, growth rates, etc.)
  - `generated_by` (text) - AI model used for generation
  - `generated_at` (timestamptz) - When the report was generated
  - `created_at` (timestamptz) - Record creation timestamp

  ### 2. `report_schedules`
  Manages automatic report generation schedules
  - `id` (uuid, primary key) - Schedule identifier
  - `report_type` (text) - 'weekly' or 'monthly'
  - `store_id` (uuid, nullable) - Store ID for store-specific reports, null for all stores
  - `is_enabled` (boolean) - Whether the schedule is active
  - `cron_expression` (text) - Cron expression for scheduling
  - `last_run_at` (timestamptz, nullable) - Last successful generation time
  - `next_run_at` (timestamptz, nullable) - Scheduled next run time
  - `notification_emails` (text[]) - Email addresses to notify on completion
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. `report_generation_logs`
  Tracks report generation history and status
  - `id` (uuid, primary key) - Log entry identifier
  - `schedule_id` (uuid, nullable) - Related schedule if auto-generated
  - `report_id` (uuid, nullable) - Generated report ID if successful
  - `report_type` (text) - Type of report attempted
  - `store_id` (uuid, nullable) - Store ID if applicable
  - `status` (text) - 'success', 'failed', or 'in_progress'
  - `started_at` (timestamptz) - Generation start time
  - `completed_at` (timestamptz, nullable) - Generation completion time
  - `error_message` (text, nullable) - Error details if failed
  - `data_summary` (jsonb) - Summary of data analyzed
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Enable RLS on all tables
  - Admin users can view all reports and manage schedules
  - Store managers can view reports for their assigned stores
  - Staff can view reports for their store

  ## Indexes
  - Performance indexes on frequently queried columns
  - Composite indexes for date range queries

  ## Notes
  - Reports are generated automatically based on schedules
  - Manual generation is also supported
  - All reports are versioned by generation timestamp
  - Historical reports are preserved for trend analysis
*/

-- Create ai_generated_reports table
CREATE TABLE IF NOT EXISTS ai_generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('weekly', 'monthly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  analysis_content jsonb NOT NULL DEFAULT '{}',
  key_insights text[] NOT NULL DEFAULT '{}',
  recommendations text[] NOT NULL DEFAULT '{}',
  metrics jsonb NOT NULL DEFAULT '{}',
  generated_by text NOT NULL DEFAULT 'gpt-4o-mini',
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create report_schedules table
CREATE TABLE IF NOT EXISTS report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL CHECK (report_type IN ('weekly', 'monthly')),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  cron_expression text NOT NULL,
  last_run_at timestamptz,
  next_run_at timestamptz,
  notification_emails text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create report_generation_logs table
CREATE TABLE IF NOT EXISTS report_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES report_schedules(id) ON DELETE SET NULL,
  report_id uuid REFERENCES ai_generated_reports(id) ON DELETE SET NULL,
  report_type text NOT NULL CHECK (report_type IN ('weekly', 'monthly')),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'in_progress')) DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  data_summary jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_reports_store_type_period ON ai_generated_reports(store_id, report_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_ai_reports_generated_at ON ai_generated_reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_schedules_enabled ON report_schedules(is_enabled, next_run_at) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_report_logs_status_started ON report_generation_logs(status, started_at DESC);

-- Enable Row Level Security
ALTER TABLE ai_generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_generation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_generated_reports

-- Admins can view all reports
CREATE POLICY "Admins can view all AI reports"
  ON ai_generated_reports FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Managers can view reports for their stores
CREATE POLICY "Managers can view reports for their stores"
  ON ai_generated_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
      AND (
        ai_generated_reports.store_id IS NULL
        OR ai_generated_reports.store_id IN (
          SELECT id FROM stores WHERE manager_id = auth.uid()
        )
      )
    )
  );

-- Staff can view reports for their store
CREATE POLICY "Staff can view reports for their store"
  ON ai_generated_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_reports
      WHERE daily_reports.user_id = auth.uid()
      AND daily_reports.store_id = ai_generated_reports.store_id
    )
  );

-- Admins can insert reports
CREATE POLICY "Admins can insert AI reports"
  ON ai_generated_reports FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- RLS Policies for report_schedules

-- Admins can manage all schedules
CREATE POLICY "Admins can view all schedules"
  ON report_schedules FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert schedules"
  ON report_schedules FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update schedules"
  ON report_schedules FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete schedules"
  ON report_schedules FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- RLS Policies for report_generation_logs

-- Admins can view all logs
CREATE POLICY "Admins can view all generation logs"
  ON report_generation_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admins can insert logs
CREATE POLICY "Admins can insert generation logs"
  ON report_generation_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admins can update logs
CREATE POLICY "Admins can update generation logs"
  ON report_generation_logs FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
