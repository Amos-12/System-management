import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { PeriodFilter, PeriodRange, defaultPeriod } from '@/components/common/PeriodFilter';
import { DollarSign, Wallet, TrendingUp, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';

export const PeriodOverview = () => {
  const [period, setPeriod] = useState<PeriodRange>(defaultPeriod());
  const [stats, setStats] = useState({ salesCount: 0, salesTotal: 0, expensesTotal: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [salesRes, expensesRes] = await Promise.all([
          (supabase as any).rpc('get_sales_totals', {
            _start: period.start.toISOString(),
            _end: period.end.toISOString(),
          }),
          (supabase as any).rpc('get_expenses_totals', {
            _start: format(period.start, 'yyyy-MM-dd'),
            _end: format(new Date(period.end.getTime() - 86400000), 'yyyy-MM-dd'),
            _user_id: null,
          }),
        ]);
        const s = salesRes.data?.[0];
        const e = expensesRes.data?.[0];
        setStats({
          salesCount: Number(s?.sales_count || 0),
          salesTotal: Number(s?.total_amount || 0),
          expensesTotal: Number(e?.total_amount || 0),
        });
      } catch (err) {
        console.error('period overview load error', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

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
                <p className="text-xl font-bold text-success">{stats.salesTotal.toFixed(2)} HTG</p>
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
                <p className="text-xl font-bold text-destructive">{stats.expensesTotal.toFixed(2)} HTG</p>
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
                  {net.toFixed(2)} HTG
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
