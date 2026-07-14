
-- =========================================
-- 1. expense_categories
-- =========================================
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nom text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company expense categories"
  ON public.expense_categories FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins manage expense categories"
  ON public.expense_categories FOR ALL
  USING (
    (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::app_role))
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::app_role))
    OR public.is_super_admin(auth.uid())
  );

CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 2. expenses
-- =========================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  libelle text NOT NULL,
  description text,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'HTG',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_company_date_idx ON public.expenses (company_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS expenses_user_idx ON public.expenses (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all company expenses"
  ON public.expenses FOR SELECT
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Authenticated can create own expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Admins update company expenses"
  ON public.expenses FOR UPDATE
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins delete company expenses"
  ON public.expenses FOR DELETE
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 3. Aggregate RPCs
-- =========================================
CREATE OR REPLACE FUNCTION public.get_sales_totals(_start timestamptz, _end timestamptz)
RETURNS TABLE(sales_count bigint, total_amount numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint, COALESCE(SUM(s.total_amount),0)::numeric
  FROM public.sales s
  WHERE s.company_id = public.get_user_company_id(auth.uid())
    AND s.created_at >= _start
    AND s.created_at < _end;
$$;

CREATE OR REPLACE FUNCTION public.get_expenses_totals(_start date, _end date, _user_id uuid DEFAULT NULL)
RETURNS TABLE(expenses_count bigint, total_amount numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint, COALESCE(SUM(e.amount),0)::numeric
  FROM public.expenses e
  WHERE e.company_id = public.get_user_company_id(auth.uid())
    AND e.expense_date >= _start
    AND e.expense_date <= _end
    AND (
      _user_id IS NULL
      OR e.user_id = _user_id
    )
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR e.user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_sales_totals(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_expenses_totals(date, date, uuid) TO authenticated;
