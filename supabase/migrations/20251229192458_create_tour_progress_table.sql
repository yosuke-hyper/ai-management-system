/*
  # Create Interactive Tour Progress Table

  1. New Tables
    - `tour_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `tour_type` (text) - Type of tour: 'first_time', 'dashboard', 'report_form', 'settings', 'ai_chat'
      - `completed` (boolean) - Whether the tour was completed
      - `skipped` (boolean) - Whether the tour was skipped
      - `last_step` (integer) - Last step the user was on
      - `completed_at` (timestamptz) - When the tour was completed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `tour_progress` table
    - Add policies for authenticated users to manage their own tour progress

  3. Indexes
    - Add index on (user_id, tour_type) for efficient lookups
*/

-- Create tour_progress table
CREATE TABLE IF NOT EXISTS tour_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tour_type text NOT NULL CHECK (tour_type IN ('first_time', 'dashboard', 'report_form', 'settings', 'ai_chat')),
  completed boolean DEFAULT false NOT NULL,
  skipped boolean DEFAULT false NOT NULL,
  last_step integer DEFAULT 0 NOT NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, tour_type)
);

-- Enable RLS
ALTER TABLE tour_progress ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tour_progress_user_type ON tour_progress(user_id, tour_type);
CREATE INDEX IF NOT EXISTS idx_tour_progress_completed ON tour_progress(user_id, completed, skipped);

-- RLS Policies
CREATE POLICY "Users can view own tour progress"
  ON tour_progress
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tour progress"
  ON tour_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tour progress"
  ON tour_progress
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own tour progress"
  ON tour_progress
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tour_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tour_progress_updated_at
  BEFORE UPDATE ON tour_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_tour_progress_updated_at();
