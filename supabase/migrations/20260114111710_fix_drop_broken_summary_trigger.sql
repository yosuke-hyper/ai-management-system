/*
  # Fix broken summary_data trigger

  1. Problem
    - The update_summary_data() trigger references a non-existent summary_data table
    - This causes INSERT to fail

  2. Solution
    - Drop the broken trigger
    - Drop the broken function
*/

-- Drop the broken trigger
DROP TRIGGER IF EXISTS update_summary_trigger ON daily_reports;

-- Drop the broken function
DROP FUNCTION IF EXISTS update_summary_data();
