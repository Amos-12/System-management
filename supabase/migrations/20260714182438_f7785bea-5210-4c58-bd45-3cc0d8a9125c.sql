
-- =========================================
-- 1. expense_categories
-- =========================================
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nom text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  ordre integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories"
  ON public.categories FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage categories"
  ON public.categories FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role))
  
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 2. expenses
-- =========================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  libelle text NOT NULL,
  description text,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'HTG',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_date_idx ON public.expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS expenses_user_idx ON public.expenses (user_id);
CREATE INDEX IF NOT EXISTS expenses_categorie_idx ON public.expenses (categorie_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all expenses"
  ON public.expenses FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid()
  );

CREATE POLICY "Authenticated can create own expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "Admins update expenses"
  ON public.expenses FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins delete expenses"
  ON public.expenses FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
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
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
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
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
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
