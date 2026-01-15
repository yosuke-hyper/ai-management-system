/*
  # Comprehensive Security and Performance Fixes

  ## 1. Missing Foreign Key Indexes
  Adding indexes for foreign keys that lack covering indexes:
  - csv_import_history.store_id
  - csv_import_history.user_id
  - import_history.store_id
  - support_requests.assigned_to
  - vendor_assignment_templates.created_by

  ## 2. RLS Policy Optimization
  Replacing `auth.<function>()` with `(select auth.<function>())` for better query performance.
  Affected tables:
  - avatar_items
  - csv_import_history
  - tour_progress
  - vendor_assignment_templates
  - vendor_assignment_template_items
  - support_requests
  - system_incidents
  - vendor_categories
  - onboarding_progress

  ## 3. Function Search Path Fixes
  Setting immutable search_path for functions:
  - update_tour_progress_updated_at
  - create_default_vendor_categories
  - log_super_admin_activity
  - generate_demo_month_data
  - refresh_demo_data
  - get_demo_base_values
  - trigger_demo_data_refresh
  - get_demo_data_status

  ## 4. Unused Index Cleanup
  Dropping indexes that have never been used to reduce storage and maintenance overhead.

  ## Security Notes
  - All changes maintain existing security model
  - RLS policies remain functionally identical, just optimized
*/

-- ============================================
-- PART 1: Add Missing Foreign Key Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_csv_import_history_store_id 
ON csv_import_history(store_id);

CREATE INDEX IF NOT EXISTS idx_csv_import_history_user_id 
ON csv_import_history(user_id);

CREATE INDEX IF NOT EXISTS idx_import_history_store_id 
ON import_history(store_id);

CREATE INDEX IF NOT EXISTS idx_support_requests_assigned_to 
ON support_requests(assigned_to);

CREATE INDEX IF NOT EXISTS idx_vendor_assignment_templates_created_by 
ON vendor_assignment_templates(created_by);

-- ============================================
-- PART 2: Fix RLS Policies - avatar_items
-- ============================================

DROP POLICY IF EXISTS "Admins can manage avatar items" ON avatar_items;
CREATE POLICY "Admins can manage avatar items" ON avatar_items
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = (select auth.uid()) 
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = (select auth.uid()) 
    AND is_active = true
  )
);

-- ============================================
-- PART 2: Fix RLS Policies - csv_import_history
-- ============================================

DROP POLICY IF EXISTS "csv_import_history_delete_admins" ON csv_import_history;
CREATE POLICY "csv_import_history_delete_admins" ON csv_import_history
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = (select auth.uid())
    AND om.organization_id = csv_import_history.organization_id
    AND om.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "csv_import_history_insert_org_members" ON csv_import_history;
CREATE POLICY "csv_import_history_insert_org_members" ON csv_import_history
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = (select auth.uid())
    AND om.organization_id = csv_import_history.organization_id
  )
);

DROP POLICY IF EXISTS "csv_import_history_select_org_members" ON csv_import_history;
CREATE POLICY "csv_import_history_select_org_members" ON csv_import_history
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = (select auth.uid())
    AND om.organization_id = csv_import_history.organization_id
  )
);

-- ============================================
-- PART 2: Fix RLS Policies - tour_progress
-- ============================================

DROP POLICY IF EXISTS "Users can delete own tour progress" ON tour_progress;
CREATE POLICY "Users can delete own tour progress" ON tour_progress
FOR DELETE TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own tour progress" ON tour_progress;
CREATE POLICY "Users can insert own tour progress" ON tour_progress
FOR INSERT TO authenticated
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own tour progress" ON tour_progress;
CREATE POLICY "Users can update own tour progress" ON tour_progress
FOR UPDATE TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own tour progress" ON tour_progress;
CREATE POLICY "Users can view own tour progress" ON tour_progress
FOR SELECT TO authenticated
USING (user_id = (select auth.uid()));

-- ============================================
-- PART 2: Fix RLS Policies - vendor_assignment_templates
-- ============================================

DROP POLICY IF EXISTS "Managers can create templates" ON vendor_assignment_templates;
CREATE POLICY "Managers can create templates" ON vendor_assignment_templates
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = (select auth.uid())
    AND om.organization_id = vendor_assignment_templates.organization_id
    AND om.role IN ('owner', 'admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Managers can delete templates" ON vendor_assignment_templates;
CREATE POLICY "Managers can delete templates" ON vendor_assignment_templates
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = (select auth.uid())
    AND om.organization_id = vendor_assignment_templates.organization_id
    AND om.role IN ('owner', 'admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Managers can update templates" ON vendor_assignment_templates;
CREATE POLICY "Managers can update templates" ON vendor_assignment_templates
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = (select auth.uid())
    AND om.organization_id = vendor_assignment_templates.organization_id
    AND om.role IN ('owner', 'admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = (select auth.uid())
    AND om.organization_id = vendor_assignment_templates.organization_id
    AND om.role IN ('owner', 'admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Users can view templates in their organization" ON vendor_assignment_templates;
CREATE POLICY "Users can view templates in their organization" ON vendor_assignment_templates
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = (select auth.uid())
    AND om.organization_id = vendor_assignment_templates.organization_id
  )
);

-- ============================================
-- PART 2: Fix RLS Policies - vendor_assignment_template_items
-- ============================================

DROP POLICY IF EXISTS "Managers can create template items" ON vendor_assignment_template_items;
CREATE POLICY "Managers can create template items" ON vendor_assignment_template_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vendor_assignment_templates vat
    JOIN organization_members om ON om.organization_id = vat.organization_id
    WHERE vat.id = vendor_assignment_template_items.template_id
    AND om.user_id = (select auth.uid())
    AND om.role IN ('owner', 'admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Managers can delete template items" ON vendor_assignment_template_items;
CREATE POLICY "Managers can delete template items" ON vendor_assignment_template_items
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendor_assignment_templates vat
    JOIN organization_members om ON om.organization_id = vat.organization_id
    WHERE vat.id = vendor_assignment_template_items.template_id
    AND om.user_id = (select auth.uid())
    AND om.role IN ('owner', 'admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Managers can update template items" ON vendor_assignment_template_items;
CREATE POLICY "Managers can update template items" ON vendor_assignment_template_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendor_assignment_templates vat
    JOIN organization_members om ON om.organization_id = vat.organization_id
    WHERE vat.id = vendor_assignment_template_items.template_id
    AND om.user_id = (select auth.uid())
    AND om.role IN ('owner', 'admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vendor_assignment_templates vat
    JOIN organization_members om ON om.organization_id = vat.organization_id
    WHERE vat.id = vendor_assignment_template_items.template_id
    AND om.user_id = (select auth.uid())
    AND om.role IN ('owner', 'admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Users can view template items" ON vendor_assignment_template_items;
CREATE POLICY "Users can view template items" ON vendor_assignment_template_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendor_assignment_templates vat
    JOIN organization_members om ON om.organization_id = vat.organization_id
    WHERE vat.id = vendor_assignment_template_items.template_id
    AND om.user_id = (select auth.uid())
  )
);

-- ============================================
-- PART 2: Fix RLS Policies - support_requests
-- ============================================

DROP POLICY IF EXISTS "Super admins can manage support requests" ON support_requests;
CREATE POLICY "Super admins can manage support requests" ON support_requests
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = (select auth.uid()) 
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = (select auth.uid()) 
    AND is_active = true
  )
);

DROP POLICY IF EXISTS "Users can create support requests" ON support_requests;
CREATE POLICY "Users can create support requests" ON support_requests
FOR INSERT TO authenticated
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own support requests" ON support_requests;
CREATE POLICY "Users can view own support requests" ON support_requests
FOR SELECT TO authenticated
USING (user_id = (select auth.uid()));

-- ============================================
-- PART 2: Fix RLS Policies - system_incidents
-- ============================================

DROP POLICY IF EXISTS "Super admins can manage system incidents" ON system_incidents;
CREATE POLICY "Super admins can manage system incidents" ON system_incidents
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = (select auth.uid()) 
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = (select auth.uid()) 
    AND is_active = true
  )
);

-- ============================================
-- PART 2: Fix RLS Policies - vendor_categories
-- ============================================

DROP POLICY IF EXISTS "Managers can create categories" ON vendor_categories;
CREATE POLICY "Managers can create categories" ON vendor_categories
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = (select auth.uid())
    AND om.organization_id = vendor_categories.organization_id
    AND om.role IN ('owner', 'admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Managers can delete categories" ON vendor_categories;
CREATE POLICY "Managers can delete categories" ON vendor_categories
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = (select auth.uid())
    AND om.organization_id = vendor_categories.organization_id
    AND om.role IN ('owner', 'admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Managers can update categories" ON vendor_categories;
CREATE POLICY "Managers can update categories" ON vendor_categories
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = (select auth.uid())
    AND om.organization_id = vendor_categories.organization_id
    AND om.role IN ('owner', 'admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = (select auth.uid())
    AND om.organization_id = vendor_categories.organization_id
    AND om.role IN ('owner', 'admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Users can view categories in their organization" ON vendor_categories;
CREATE POLICY "Users can view categories in their organization" ON vendor_categories
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = (select auth.uid())
    AND om.organization_id = vendor_categories.organization_id
  )
);

-- ============================================
-- PART 2: Fix RLS Policies - onboarding_progress
-- ============================================

DROP POLICY IF EXISTS "Users can insert own onboarding progress" ON onboarding_progress;
CREATE POLICY "Users can insert own onboarding progress" ON onboarding_progress
FOR INSERT TO authenticated
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own onboarding progress" ON onboarding_progress;
CREATE POLICY "Users can update own onboarding progress" ON onboarding_progress
FOR UPDATE TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own onboarding progress" ON onboarding_progress;
CREATE POLICY "Users can view own onboarding progress" ON onboarding_progress
FOR SELECT TO authenticated
USING (user_id = (select auth.uid()));

-- ============================================
-- PART 3: Fix Function Search Paths
-- ============================================

DROP FUNCTION IF EXISTS update_tour_progress_updated_at() CASCADE;
CREATE FUNCTION update_tour_progress_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_tour_progress_updated_at_trigger
  BEFORE UPDATE ON tour_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_tour_progress_updated_at();

DROP FUNCTION IF EXISTS create_default_vendor_categories() CASCADE;
CREATE FUNCTION create_default_vendor_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO vendor_categories (organization_id, name, display_order, is_active)
  VALUES
    (NEW.id, '青果', 1, true),
    (NEW.id, '精肉', 2, true),
    (NEW.id, '鮮魚', 3, true),
    (NEW.id, '乳製品', 4, true),
    (NEW.id, '冷凍食品', 5, true),
    (NEW.id, '調味料', 6, true),
    (NEW.id, '飲料', 7, true),
    (NEW.id, '消耗品', 8, true),
    (NEW.id, 'その他', 9, true)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_default_vendor_categories_trigger
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_default_vendor_categories();

DROP FUNCTION IF EXISTS log_super_admin_activity() CASCADE;
CREATE FUNCTION log_super_admin_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action_type text;
  v_target_type text;
  v_target_id uuid;
  v_details jsonb;
BEGIN
  v_target_type := TG_ARGV[0];
  
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'create';
    v_target_id := NEW.id;
    v_details := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action_type := 'update';
    v_target_id := NEW.id;
    v_details := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    v_action_type := 'delete';
    v_target_id := OLD.id;
    v_details := to_jsonb(OLD);
  END IF;

  INSERT INTO admin_activity_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
    v_action_type,
    v_target_type,
    v_target_id,
    v_details,
    NULL
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS get_demo_base_values(text);
CREATE FUNCTION get_demo_base_values(p_store_name text)
RETURNS TABLE(base_sales numeric, base_food_cost_rate numeric, base_labor_cost_rate numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE p_store_name
      WHEN '渋谷店' THEN 180000::numeric
      WHEN '新宿店' THEN 220000::numeric
      WHEN '池袋店' THEN 150000::numeric
      ELSE 150000::numeric
    END as base_sales,
    CASE p_store_name
      WHEN '渋谷店' THEN 0.32::numeric
      WHEN '新宿店' THEN 0.30::numeric
      WHEN '池袋店' THEN 0.33::numeric
      ELSE 0.32::numeric
    END as base_food_cost_rate,
    CASE p_store_name
      WHEN '渋谷店' THEN 0.28::numeric
      WHEN '新宿店' THEN 0.26::numeric
      WHEN '池袋店' THEN 0.30::numeric
      ELSE 0.28::numeric
    END as base_labor_cost_rate;
END;
$$;

DROP FUNCTION IF EXISTS generate_demo_month_data(integer, integer);
CREATE FUNCTION generate_demo_month_data(
  p_year integer,
  p_month integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_demo_org_id uuid;
  v_store record;
  v_date date;
  v_start_date date;
  v_end_date date;
  v_day_of_week integer;
  v_is_weekend boolean;
  v_base_values record;
  v_daily_sales numeric;
  v_food_cost numeric;
  v_labor_cost numeric;
  v_customers integer;
  v_random_factor numeric;
BEGIN
  SELECT id INTO v_demo_org_id FROM fixed_demo_organizations LIMIT 1;
  
  IF v_demo_org_id IS NULL THEN
    RAISE NOTICE 'No demo organization found';
    RETURN;
  END IF;

  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + interval '1 month' - interval '1 day')::date;

  FOR v_store IN SELECT * FROM fixed_demo_stores WHERE demo_organization_id = v_demo_org_id
  LOOP
    SELECT * INTO v_base_values FROM get_demo_base_values(v_store.name);
    
    v_date := v_start_date;
    WHILE v_date <= v_end_date LOOP
      v_day_of_week := EXTRACT(DOW FROM v_date)::integer;
      v_is_weekend := v_day_of_week IN (0, 6);
      
      v_random_factor := 0.85 + (random() * 0.30);
      
      IF v_is_weekend THEN
        v_daily_sales := v_base_values.base_sales * 1.3 * v_random_factor;
      ELSE
        v_daily_sales := v_base_values.base_sales * v_random_factor;
      END IF;
      
      v_food_cost := v_daily_sales * (v_base_values.base_food_cost_rate + (random() * 0.04 - 0.02));
      v_labor_cost := v_daily_sales * (v_base_values.base_labor_cost_rate + (random() * 0.04 - 0.02));
      v_customers := (v_daily_sales / 1500 * (0.9 + random() * 0.2))::integer;

      INSERT INTO fixed_demo_daily_reports (
        demo_store_id,
        demo_organization_id,
        report_date,
        total_sales,
        cash_sales,
        card_sales,
        other_sales,
        food_cost,
        labor_cost,
        other_cost,
        customer_count,
        notes
      ) VALUES (
        v_store.id,
        v_demo_org_id,
        v_date,
        round(v_daily_sales),
        round(v_daily_sales * 0.4),
        round(v_daily_sales * 0.5),
        round(v_daily_sales * 0.1),
        round(v_food_cost),
        round(v_labor_cost),
        round(v_daily_sales * 0.05),
        v_customers,
        NULL
      )
      ON CONFLICT (demo_store_id, report_date) 
      DO UPDATE SET
        total_sales = EXCLUDED.total_sales,
        cash_sales = EXCLUDED.cash_sales,
        card_sales = EXCLUDED.card_sales,
        other_sales = EXCLUDED.other_sales,
        food_cost = EXCLUDED.food_cost,
        labor_cost = EXCLUDED.labor_cost,
        other_cost = EXCLUDED.other_cost,
        customer_count = EXCLUDED.customer_count;

      v_date := v_date + interval '1 day';
    END LOOP;
  END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS refresh_demo_data();
CREATE FUNCTION refresh_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_year integer;
  v_current_month integer;
  v_prev_month integer;
  v_prev_year integer;
  v_two_months_ago_month integer;
  v_two_months_ago_year integer;
BEGIN
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::integer;
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE)::integer;
  
  IF v_current_month = 1 THEN
    v_prev_month := 12;
    v_prev_year := v_current_year - 1;
  ELSE
    v_prev_month := v_current_month - 1;
    v_prev_year := v_current_year;
  END IF;
  
  IF v_prev_month = 1 THEN
    v_two_months_ago_month := 12;
    v_two_months_ago_year := v_prev_year - 1;
  ELSE
    v_two_months_ago_month := v_prev_month - 1;
    v_two_months_ago_year := v_prev_year;
  END IF;

  DELETE FROM fixed_demo_daily_reports
  WHERE report_date < make_date(v_two_months_ago_year, v_two_months_ago_month, 1);

  PERFORM generate_demo_month_data(v_two_months_ago_year, v_two_months_ago_month);
  PERFORM generate_demo_month_data(v_prev_year, v_prev_month);
  PERFORM generate_demo_month_data(v_current_year, v_current_month);
  
  RAISE NOTICE 'Demo data refreshed for months: %/%, %/%, %/%', 
    v_two_months_ago_year, v_two_months_ago_month,
    v_prev_year, v_prev_month,
    v_current_year, v_current_month;
END;
$$;

DROP FUNCTION IF EXISTS trigger_demo_data_refresh() CASCADE;
CREATE FUNCTION trigger_demo_data_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM refresh_demo_data();
  RETURN NULL;
END;
$$;

DROP FUNCTION IF EXISTS get_demo_data_status();
CREATE FUNCTION get_demo_data_status()
RETURNS TABLE(
  month_year text,
  report_count bigint,
  store_count bigint,
  date_range text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_char(report_date, 'YYYY-MM') as month_year,
    count(*) as report_count,
    count(DISTINCT demo_store_id) as store_count,
    min(report_date)::text || ' to ' || max(report_date)::text as date_range
  FROM fixed_demo_daily_reports
  GROUP BY to_char(report_date, 'YYYY-MM')
  ORDER BY month_year DESC;
END;
$$;

-- ============================================
-- PART 4: Drop Unused Indexes
-- ============================================

DROP INDEX IF EXISTS idx_system_admins_granted_by;
DROP INDEX IF EXISTS idx_avatar_items_category;
DROP INDEX IF EXISTS idx_avatar_items_price;
DROP INDEX IF EXISTS idx_profiles_unlocked_items;
DROP INDEX IF EXISTS idx_profiles_equipped_items;
DROP INDEX IF EXISTS idx_api_performance_logs_organization_id;
DROP INDEX IF EXISTS idx_admin_activity_logs_target_organization_id;
DROP INDEX IF EXISTS idx_admin_override_logs_organization_id;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_daily_report_vendor_purchases_organization_id;
DROP INDEX IF EXISTS idx_daily_report_vendor_purchases_vendor_id;
DROP INDEX IF EXISTS idx_admin_override_logs_store_id;
DROP INDEX IF EXISTS idx_ai_conversations_demo_session_id;
DROP INDEX IF EXISTS idx_ai_conversations_organization_id;
DROP INDEX IF EXISTS idx_ai_messages_organization_id;
DROP INDEX IF EXISTS idx_ai_usage_tracking_store_id;
DROP INDEX IF EXISTS idx_daily_reports_last_edited_by;
DROP INDEX IF EXISTS idx_daily_targets_organization_id;
DROP INDEX IF EXISTS idx_demo_monthly_expenses_demo_org_id;
DROP INDEX IF EXISTS idx_demo_stores_brand_id;
DROP INDEX IF EXISTS idx_error_logs_organization_id;
DROP INDEX IF EXISTS idx_error_logs_resolved_by;
DROP INDEX IF EXISTS idx_error_logs_user_id;
DROP INDEX IF EXISTS idx_expense_baselines_organization_id;
DROP INDEX IF EXISTS idx_fixed_demo_stores_brand_id;
DROP INDEX IF EXISTS idx_notifications_organization_id;
DROP INDEX IF EXISTS idx_report_generation_logs_organization_id;
DROP INDEX IF EXISTS idx_organization_members_store_id;
DROP INDEX IF EXISTS idx_organization_subscriptions_plan_id;
DROP INDEX IF EXISTS idx_report_generation_logs_report_id;
DROP INDEX IF EXISTS idx_report_generation_logs_schedule_id;
DROP INDEX IF EXISTS idx_report_generation_logs_store_id;
DROP INDEX IF EXISTS idx_report_schedules_store_id;
DROP INDEX IF EXISTS idx_store_assignments_organization_id;
DROP INDEX IF EXISTS idx_store_assignments_store_id;
DROP INDEX IF EXISTS idx_store_holidays_organization_id;
DROP INDEX IF EXISTS idx_store_regular_closed_days_organization_id;
DROP INDEX IF EXISTS idx_store_vendor_assignments_vendor_id;
DROP INDEX IF EXISTS idx_stores_manager_id;
DROP INDEX IF EXISTS idx_summary_data_store_id;
DROP INDEX IF EXISTS idx_csv_import_history_org_id;
DROP INDEX IF EXISTS idx_csv_import_history_created_at;
DROP INDEX IF EXISTS idx_tour_progress_completed;
DROP INDEX IF EXISTS idx_vendor_templates_org;
DROP INDEX IF EXISTS idx_vendor_templates_brand;
DROP INDEX IF EXISTS idx_vendor_template_items_template;
DROP INDEX IF EXISTS idx_vendor_template_items_vendor;
DROP INDEX IF EXISTS idx_profiles_points;
DROP INDEX IF EXISTS idx_profiles_total_points;
DROP INDEX IF EXISTS idx_support_requests_user_id;
DROP INDEX IF EXISTS idx_support_requests_status;
DROP INDEX IF EXISTS idx_support_requests_created_at;
DROP INDEX IF EXISTS idx_system_incidents_status;
DROP INDEX IF EXISTS idx_system_incidents_created_at;
DROP INDEX IF EXISTS idx_vendor_categories_active;
DROP INDEX IF EXISTS idx_import_history_created_at;
DROP INDEX IF EXISTS idx_import_history_user_id;
DROP INDEX IF EXISTS idx_onboarding_progress_org_id;