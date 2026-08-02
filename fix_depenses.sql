-- =========================================================
-- Dépenses : taux de change + politiques RLS
-- À exécuter dans Supabase -> SQL Editor
-- =========================================================

-- 1) Taux USD -> HTG configurable
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS usd_to_htg_rate numeric NOT NULL DEFAULT 132;

-- 2) Table dépenses : contraintes de cohérence
ALTER TABLE public.expenses
  ALTER COLUMN currency SET DEFAULT 'HTG';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_amount_positive'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_amount_positive CHECK (amount > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_currency_valid'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_currency_valid CHECK (currency IN ('HTG','USD'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS expenses_date_idx ON public.expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS expenses_user_idx ON public.expenses (user_id);

-- 3) Droits Data API
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;

-- 4) RLS : le vendeur ne voit que ses dépenses, l'admin voit tout
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;

CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "expenses_insert" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "expenses_update" ON public.expenses
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "expenses_delete" ON public.expenses
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 5) Rechargement du cache PostgREST
NOTIFY pgrst, 'reload schema';
