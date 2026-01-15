/*
  # Fix log_contract_change to Handle NULL auth.uid()

  1. Problem
    - log_contract_change() uses auth.uid() for changed_by column
    - When creating subscriptions via SQL (not from authenticated user), auth.uid() is NULL
    - This causes NOT NULL constraint violation

  2. Solution
    - Use COALESCE to provide a default UUID when auth.uid() is NULL
    - Use a special system UUID for automated/system changes

  3. Changes
    - Update log_contract_change() to handle NULL auth.uid()
*/

CREATE OR REPLACE FUNCTION public.log_contract_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  system_user_id uuid := '00000000-0000-0000-0000-000000000000';
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
      COALESCE(auth.uid(), system_user_id),
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
      COALESCE(auth.uid(), system_user_id),
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
