/*
  # Add tour progress tracking columns

  1. Changes to onboarding_progress table
    - `tour_dashboard_completed` (boolean) - Dashboard tour completion status
    - `tour_report_form_completed` (boolean) - Report form tour completion status
    - `tour_current_step` (text) - Current step ID for resume functionality
    - `tour_current_tour` (text) - Current tour name for resume functionality
    - `tour_dismissed_until` (timestamptz) - When user clicked "later", don't show until this time

  2. Purpose
    - Enable tour resume after page reload
    - Track which tours have been completed
    - Respect user's "remind me later" choice
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_progress' AND column_name = 'tour_dashboard_completed'
  ) THEN
    ALTER TABLE onboarding_progress ADD COLUMN tour_dashboard_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_progress' AND column_name = 'tour_report_form_completed'
  ) THEN
    ALTER TABLE onboarding_progress ADD COLUMN tour_report_form_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_progress' AND column_name = 'tour_current_step'
  ) THEN
    ALTER TABLE onboarding_progress ADD COLUMN tour_current_step text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_progress' AND column_name = 'tour_current_tour'
  ) THEN
    ALTER TABLE onboarding_progress ADD COLUMN tour_current_tour text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_progress' AND column_name = 'tour_dismissed_until'
  ) THEN
    ALTER TABLE onboarding_progress ADD COLUMN tour_dismissed_until timestamptz;
  END IF;
END $$;