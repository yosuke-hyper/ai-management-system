/*
  # Reset Production Database to Clean State

  This migration resets all data in the production database while preserving the schema structure.
  Current demo data (stores, reports, etc.) will only be shown in demo mode.

  1. Data Reset
     - Clear all tables while preserving structure
     - Reset sequences and indexes
     
  2. Clean State
     - Production starts with empty database
     - Demo mode shows existing mock data
     
  3. Security
     - Maintain all RLS policies
     - Preserve user management structure
*/

-- Clear all data while preserving table structure
TRUNCATE TABLE public.store_vendor_assignments CASCADE;
TRUNCATE TABLE public.monthly_expenses CASCADE;
TRUNCATE TABLE public.daily_reports CASCADE;
TRUNCATE TABLE public.summary_data CASCADE;
TRUNCATE TABLE public.targets CASCADE;
TRUNCATE TABLE public.store_assignments CASCADE;
TRUNCATE TABLE public.stores CASCADE;
TRUNCATE TABLE public.vendors CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- Reset any sequences if they exist
-- Note: UUID primary keys don't use sequences, but if there are any serial columns
DO $$
BEGIN
    -- Reset any auto-increment sequences if they exist
    PERFORM setval(pg_get_serial_sequence('public.stores', 'id'), 1, false)
    WHERE pg_get_serial_sequence('public.stores', 'id') IS NOT NULL;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore if no serial sequences exist
        NULL;
END $$;

-- Verify tables are empty
DO $$
DECLARE
    rec RECORD;
    table_count INTEGER;
BEGIN
    FOR rec IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '%_backup'
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM public.%I', rec.table_name) INTO table_count;
        RAISE NOTICE 'Table % has % rows after reset', rec.table_name, table_count;
    END LOOP;
END $$;