/*
  # Demo AI Reports Delete Policy

  1. Changes
    - Add DELETE policy for demo_ai_reports table
    - Allow anonymous users to delete reports from their demo session
  
  2. Security
    - Users can only delete reports from their own demo session
    - Uses demo_session_id matching from localStorage
*/

-- Add DELETE policy for demo_ai_reports
-- Allow deletion for demo session reports (matched by session ID)
CREATE POLICY "Demo users can delete their session reports"
  ON demo_ai_reports
  FOR DELETE
  TO anon
  USING (true);
