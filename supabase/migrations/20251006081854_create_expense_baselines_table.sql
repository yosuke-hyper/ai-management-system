/*
  # Create expense_baselines table

  1. New Tables
    - `expense_baselines`
      - `id` (uuid, primary key)
      - `store_id` (uuid, foreign key to stores)
      - `month` (text, format: YYYY-MM)
      - Monthly expense baseline fields:
        - `labor_cost_employee` (numeric)
        - `labor_cost_part_time` (numeric)
        - `utilities` (numeric)
        - `promotion` (numeric)
        - `cleaning` (numeric)
        - `misc` (numeric)
        - `communication` (numeric)
        - `others` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `expense_baselines` table
    - Add SELECT policy for authenticated users (admin or assigned store)
    - Add INSERT/UPDATE/DELETE policies for admin only

  3. Indexes
    - Add index on (store_id, month) for performance
*/

-- Create expense_baselines table
CREATE TABLE IF NOT EXISTS public.expense_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  month text NOT NULL,
  labor_cost_employee numeric NOT NULL DEFAULT 0,
  labor_cost_part_time numeric NOT NULL DEFAULT 0,
  utilities numeric NOT NULL DEFAULT 0,
  promotion numeric NOT NULL DEFAULT 0,
  cleaning numeric NOT NULL DEFAULT 0,
  misc numeric NOT NULL DEFAULT 0,
  communication numeric NOT NULL DEFAULT 0,
  others numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_expense_baselines_store_month UNIQUE (store_id, month),
  CONSTRAINT ck_expense_baselines_month_format CHECK (month ~ '^[0-9]{4}-[0-9]{2}$')
);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trg_expense_baselines_updated_at ON public.expense_baselines;
CREATE TRIGGER trg_expense_baselines_updated_at
  BEFORE UPDATE ON public.expense_baselines
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_expense_baselines_store_month
  ON public.expense_baselines(store_id, month);

-- Enable RLS
ALTER TABLE public.expense_baselines ENABLE ROW LEVEL SECURITY;

-- SELECT policy: admin or assigned store users
DROP POLICY IF EXISTS "expense_baselines_select" ON public.expense_baselines;
CREATE POLICY "expense_baselines_select"
  ON public.expense_baselines
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1
      FROM public.store_assignments sa
      WHERE sa.user_id = auth.uid()
        AND sa.store_id = expense_baselines.store_id
    )
  );

-- INSERT policy: admin only
DROP POLICY IF EXISTS "expense_baselines_ins" ON public.expense_baselines;
CREATE POLICY "expense_baselines_ins"
  ON public.expense_baselines
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- UPDATE policy: admin only
DROP POLICY IF EXISTS "expense_baselines_upd" ON public.expense_baselines;
CREATE POLICY "expense_baselines_upd"
  ON public.expense_baselines
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE policy: admin only
DROP POLICY IF EXISTS "expense_baselines_del" ON public.expense_baselines;
CREATE POLICY "expense_baselines_del"
  ON public.expense_baselines
  FOR DELETE
  TO authenticated
  USING (public.is_admin());