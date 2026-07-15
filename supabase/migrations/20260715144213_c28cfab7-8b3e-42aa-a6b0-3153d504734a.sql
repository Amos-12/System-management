ALTER TABLE public.expenses DROP COLUMN IF EXISTS category_id;
DROP TABLE IF EXISTS public.expense_categories CASCADE;

-- Update get_expenses_totals to keep signature working (no change needed as it doesn't reference category)