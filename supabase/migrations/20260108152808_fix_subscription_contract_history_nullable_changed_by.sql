/*
  # Fix subscription_contract_history changed_by Column

  1. Problem
    - changed_by column is NOT NULL with FK to auth.users
    - When subscriptions are created automatically (e.g., during user registration),
      there's no authenticated user context (auth.uid() is NULL)
    - Using a system UUID fails because it doesn't exist in auth.users

  2. Solution
    - Make changed_by column NULLABLE
    - NULL indicates system/automated changes
    - Non-NULL indicates user-initiated changes

  3. Changes
    - Alter column to allow NULL values
    - Update trigger function to use NULL instead of system UUID
*/

-- Make changed_by nullable
ALTER TABLE subscription_contract_history
ALTER COLUMN changed_by DROP NOT NULL;

-- Update trigger function to use NULL for system changes
CREATE OR REPLACE FUNCTION public.log_contract_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log contract count changes
  IF TG_OP = 'INSERT' THEN
    INSERT INTO subscription_contract_history (
      organization_id,
      subscription_id,
      changed_by,
      change_type,
      contracts_before,
      contracts_after,
      reason
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      auth.uid(), -- NULL when no authenticated user
      'initial',
      0,
      NEW.contracts_count,
      '初期契約設定'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.contracts_count != NEW.contracts_count THEN
    INSERT INTO subscription_contract_history (
      organization_id,
      subscription_id,
      changed_by,
      change_type,
      contracts_before,
      contracts_after,
      reason
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      auth.uid(), -- NULL when no authenticated user
      CASE 
        WHEN NEW.contracts_count > OLD.contracts_count THEN 'increase'
        ELSE 'decrease'
      END,
      OLD.contracts_count,
      NEW.contracts_count,
      '契約店舗数変更'
    );
  END IF;
  
  RETURN NEW;
END;
$$;
