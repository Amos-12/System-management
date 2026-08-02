import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { PeriodFilter, PeriodRange, defaultPeriod } from '@/components/common/PeriodFilter';
import { DollarSign, Wallet, TrendingUp, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { toHTG, formatHTG } from '@/lib/currency';

const PAGE = 1000;

export const PeriodOverview = () => {
  const { rate } = useExchangeRate();
  const [period, setPeriod] = useState<PeriodRange>(defaultPeriod());
  const [stats, setStats] = useState({ salesCount: 0, salesTotal: 0, expensesTotal: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const startStr = format(period.start, 'yyyy-MM-dd');
        const endStr = format(new Date(period.end.getTime() - 86400000), 'yyyy-MM-dd');

        const salesRes = await (supabase as any).rpc('get_sales_totals', {
          _start: period.start.toISOString(),
          _end: period.end.toISOString(),
        });

        // Dépenses : converties en HTG (les montants USD sont convertis au taux configuré)
        let expensesTotal = 0;
        let from = 0;
        while (true) {
          const { data, error } = await (supabase as any)
            .from('expenses')
            .select('amount, currency')
            .gte('expense_date', startStr)
            .lte('expense_date', endStr)
            .range(from, from + PAGE - 1);
          if (error) throw error;
          const rows = data || [];
          expensesTotal += rows.reduce(
            (s: number, r: any) => s + toHTG(r.amount, r.currency, rate),
            0
          );
          if (rows.length < PAGE) break;
          from += PAGE;
        }

        const s = salesRes.data?.[0];
        setStats({
          salesCount: Number(s?.sales_count || 0),
          salesTotal: Number(s?.total_amount || 0),
          expensesTotal,
        });
      } catch (err) {
        console.error('period overview load error', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period, rate]);

  const net = useMemo(() => stats.salesTotal - stats.expensesTotal, [stats]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Vue d'ensemble</h2>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ventes</p>
                <p className="text-xl font-bold">{stats.salesCount}</p>
              </div>
              <ShoppingCart className="w-6 h-6 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total ventes</p>
                <p className="text-xl font-bold text-success">{formatHTG(stats.salesTotal)}</p>
              </div>
              <DollarSign className="w-6 h-6 text-success opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Dépenses</p>
                <p className="text-xl font-bold text-destructive">{formatHTG(stats.expensesTotal)}</p>
              </div>
              <Wallet className="w-6 h-6 text-destructive opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Bénéfice net</p>
                <p className={`text-xl font-bold ${net >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatHTG(net)}
                </p>
              </div>
              <TrendingUp className="w-6 h-6 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>
      {loading && <p className="text-xs text-muted-foreground">Actualisation…</p>}
    </div>
  );
};
