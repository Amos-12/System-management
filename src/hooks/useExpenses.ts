import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Expense {
  id: string;
  company_id: string;
  user_id: string;
  libelle: string;
  description: string | null;
  amount: number;
  currency: string;
  expense_date: string;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  category?: { id: string; nom: string } | null;
  author?: { full_name: string } | null;
}

export interface ExpenseCategory {
  id: string;
  nom: string;
  is_active: boolean;
}

export function useExpenseCategories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('expense_categories')
      .select('id, nom, is_active')
      .order('nom');
    setCategories((data as ExpenseCategory[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { categories, loading, refetch: load };
}

export function useExpenses(startDate: string, endDate: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('expenses')
      .select('*, category:category_id(id, nom)')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('load expenses error', error);
      setExpenses([]);
      setLoading(false);
      return;
    }

    // Enrich with author names in one query
    const ids = Array.from(new Set((data || []).map((e: any) => e.user_id)));
    let authorMap: Record<string, string> = {};
    if (ids.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', ids);
      profiles?.forEach((p: any) => { authorMap[p.user_id] = p.full_name; });
    }
    const enriched = (data || []).map((e: any) => ({
      ...e,
      author: { full_name: authorMap[e.user_id] || '—' }
    }));
    setExpenses(enriched as Expense[]);
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  return { expenses, loading, refetch: load };
}
