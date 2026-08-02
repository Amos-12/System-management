import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Expense {
  id: string;
  user_id: string;
  libelle: string;
  description: string | null;
  amount: number;
  currency: string;
  expense_date: string;
  created_at: string;
  updated_at: string;
  author?: { full_name: string } | null;
}

export type ExpenseScope = 'all' | 'mine';

const PAGE = 1000;

export function useExpenses(
  startDate: string,
  endDate: string,
  scope: ExpenseScope = 'all',
  userId?: string | null
) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (scope === 'mine' && !userId) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const rows: any[] = [];
    let from = 0;
    // Pagination pour dépasser la limite de 1000 lignes
    while (true) {
      let q = (supabase as any)
        .from('expenses')
        .select('*')
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, from + PAGE - 1);

      if (scope === 'mine' && userId) q = q.eq('user_id', userId);

      const { data, error: err } = await q;
      if (err) {
        console.error('load expenses error', err);
        setError(err.message);
        setExpenses([]);
        setLoading(false);
        return;
      }
      const batch = data || [];
      rows.push(...batch);
      if (batch.length < PAGE) break;
      from += PAGE;
    }

    const ids = Array.from(new Set(rows.map((e: any) => e.user_id as string))) as string[];
    const authorMap: Record<string, string> = {};
    if (ids.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', ids);
      profiles?.forEach((p: any) => { authorMap[p.user_id] = p.full_name; });
    }

    setExpenses(rows.map((e: any) => ({
      ...e,
      author: { full_name: authorMap[e.user_id] || '—' },
    })) as Expense[]);
    setLoading(false);
  }, [startDate, endDate, scope, userId]);

  useEffect(() => { load(); }, [load]);

  return { expenses, loading, error, refetch: load };
}
