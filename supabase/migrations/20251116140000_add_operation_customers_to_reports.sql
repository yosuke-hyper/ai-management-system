/*
  # Add operation-specific customer counts to daily reports

  1. Changes
    - Add `lunch_customers` column to `daily_reports` table (integer, nullable)
    - Add `dinner_customers` column to `daily_reports` table (integer, nullable)
    - Add `lunch_customers` column to `fixed_demo_reports` table (integer, nullable)
    - Add `dinner_customers` column to `fixed_demo_reports` table (integer, nullable)

  2. Purpose
    - Track customer counts separately for lunch and dinner service periods
    - Enables more accurate per-period average ticket calculations
    - Supports better business analytics by service period
*/

-- Add operation-specific customer counts to daily_reports
ALTER TABLE daily_reports
ADD COLUMN IF NOT EXISTS lunch_customers integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS dinner_customers integer DEFAULT 0;

-- Add operation-specific customer counts to fixed_demo_reports
ALTER TABLE fixed_demo_reports
ADD COLUMN IF NOT EXISTS lunch_customers integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS dinner_customers integer DEFAULT 0;
